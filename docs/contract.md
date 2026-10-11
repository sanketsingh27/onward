# Onward — Integration Contract

Frozen interfaces every ticket codes against. **Read-only to workers** — a change here goes through the integration owner (with a broadcast note), never silently. This is the single source of truth for the seams.

## Module partition (one owner per module, no shared files)

| Module | Track / owner | Files |
|---|---|---|
| Worker scaffold + D1 schema + board seed | A — Scaffold | `worker/`, `migrations/`, `seed/` |
| Ingestion | Pipeline | `src/ingest/` |
| Hard filter | Pipeline | `src/filter/` |
| Embedding | Pipeline | `src/embed/` |
| Vector search | Pipeline | `src/vector/` |
| Ranking + reason | Pipeline | `src/rank/` |
| State | B — State | `src/state/` |
| Dashboard UI | C — UI | `app/` (Next.js) |
| Contract + fixtures | Integration owner | `docs/contract.md`, `fixtures/` |

## D1 schema

```
boards   { slug TEXT PK, company_name TEXT, feed_url TEXT, ats TEXT, last_fetched_at TEXT }
users    { id INTEGER PK, email TEXT, name TEXT }
openings { id TEXT PK, board TEXT, company TEXT, title TEXT, location TEXT, secondary_locations TEXT,
           remote TEXT, currency TEXT, salary_min INTEGER, salary_max INTEGER, equity_min REAL,
           equity_max REAL, bonus INTEGER, employment_type TEXT, published_at TEXT, apply_url TEXT,
           description_plain TEXT }
opening_embeddings { opening_id TEXT PK, description_hash TEXT }
state    { id INTEGER PK, user_id INTEGER, opening_id TEXT, status TEXT, updated_at TEXT }
         -- status ∈ saved | applied | dismissed
```

## Opening type (TS)

```ts
type Opening = {
  id: string; board: string; company: string; title: string;
  location: string; secondaryLocations: string[];
  remote: 'Remote' | 'Hybrid' | 'Onsite';
  compensation: { currency: string; salaryMin: number; salaryMax: number; equityMin?: number; equityMax?: number; bonus?: boolean };
  employmentType: 'FullTime' | 'Contract';
  publishedAt: string; applyUrl: string; descriptionPlain: string;
};

type RankedOpening = Opening & {
  fit: number;            // 0–100, calculated for the response
};
```

## Vectorize

- Index `openings`, **768 dimensions**, cosine.
- Embedding model: Workers AI `@cf/baai/bge-base-en-v1.5`.
- One vector per Opening description, updated only when its embedded text changes.
- One cached Resume vector per Profile Resume version.
- Fit is calculated by the `GET /openings` query and is never persisted.

## API routes

```
GET  /boards                                      -> Board[]
GET  /openings?limit=1..100                       -> RankedOpening[] (available only)
GET  /openings/history?limit=1..100&cursor=<id>   -> { data: HistoryOpening[], nextCursor }
GET  /state                                       -> state rows
PUT  /state { opening_id, status }                -> { ok: true }
POST /ingest                                      -> BoardOutcome[]
```

## Fixtures (committed, used by every ticket's tests)

- `fixtures/ashby-sample.json` — one board's response: two listed postings, one unlisted.
- `fixtures/profile.md` — a resume + filters to run the hard filter against.

## Coordination rules (how parallelism stays safe)

1. Claim before work — a ticket's assignee is its claim; an unassigned open ticket is fair game.
2. Code against this contract and the fixtures; never wait on another track's runtime output.
3. Green locally against fixtures; cross-module integration happens at the join tickets, by the owner.
4. The tracker's frontier is the only plan — no private plans, no drifting from blockers.
