# Spec: Automatic development bootstrap across worktrees

## Problem Statement

Starting Onward locally does not currently produce a complete demo. The development launcher initializes the schema and Board registry, but the registry contains Board URLs, not Opening records. A job-seeker can therefore have registered live Boards while the Opening table remains empty. Opening records alone also do not produce recommendations: Recall requires real Embeddings in Vectorize and a Profile owned by the authenticated Clerk account.

Creating another Git worktree adds setup overhead. Ignored frontend and backend Clerk configuration is not automatically available there, and copying keys and account IDs manually is repetitive. Each worktree should start with its own local database state while reusing the existing development configuration and private Resume input.

The supplied Resume must create the demo Profile. An unrelated synthetic Profile is not an acceptable substitute. The existing signed-in development account can also be used for saved, applied, and dismissed demo State.

## Solution

Make the existing development launcher bootstrap missing data automatically. A fresh worktree should resolve existing development configuration, initialize its own local databases, load the supplied Resume, import live Openings from the registered Ashby Boards, create the Profile under the existing Clerk account, generate real Embeddings, and populate example State.

Subsequent startup should preserve the job-seeker's edits and decisions, skip completed work, and repair incomplete bootstrap stages. Two inspectable content inputs drive this process: a private Resume file and a local cache of live Opening source data. Clerk configuration and account ownership are resolved automatically rather than becoming additional manually maintained content inputs.

This is the approved feature scope. This delivery specifies the behavior; it does not implement the bootstrap or create an implementation plan.

## User Stories

### First-run demo

1. As a developer, I want one development startup command to prepare the demo, so that I do not execute several manual seed and embedding steps.
2. As a developer, I want existing registered Boards to supply live Openings, so that the demo contains actual current opportunities rather than synthetic vacancies.
3. As a job-seeker, I want my supplied Resume to create my Profile, so that recommendations use my skills and experience.
4. As a developer, I want all current domain tables populated on first setup, so that I can inspect the full application data flow.
5. As a developer, I want saved, applied, and dismissed demo State on my existing account, so that I can check those application surfaces without creating another account.

### Resume, Profile, and ownership

6. As a job-seeker, I want the complete Resume stored in my initial Profile, so that a generic fixture is never substituted for my background.
7. As a job-seeker, I want Profile filters kept separate from Resume facts, so that salary expectations and preferred locations are not invented from employment history.
8. As a developer, I want the existing development Clerk account resolved automatically, so that I do not copy its opaque user ID into seed files.
9. As a job-seeker, I want seeded Profile and State owned by the same account I sign in with, so that I can see the demo in the authenticated dashboard.
10. As a developer, I want ambiguous or missing account matches reported clearly, so that bootstrap does not seed another person's account or create a new Clerk user.

### Worktree setup

11. As a developer, I want missing frontend and backend configuration reused from the primary worktree, so that a new worktree does not require manually copied keys.
12. As a developer, I want existing worktree-local configuration to take precedence, so that intentional local overrides are preserved.
13. As a developer, I want configuration discovery based on Git metadata, so that startup works without machine-specific hardcoded paths.
14. As a developer, I want each worktree to have independent local database state, so that checking one branch does not change another branch's application data.
15. As a developer, I want the private Resume reusable across worktrees without sharing their databases, so that fresh setup retains the right source content without carrying over previous demo State.

### Embeddings and recommendations

16. As a job-seeker, I want a real Resume Embedding generated from the text stored in my Profile, so that the cached hash and vector represent the same Resume version.
17. As a developer, I want live Opening descriptions embedded and indexed before they are marked complete, so that an incomplete index is not mistaken for working Recall.
18. As a developer, I want unchanged Embeddings reused, so that repeated startup avoids unnecessary Workers AI work and Vectorize writes.
19. As a developer, I want a changed Resume to invalidate only its stale Embedding, so that other unchanged data remains reusable.
20. As a job-seeker, I want available Survivors retained alongside demo history, so that checking saved, applied, and dismissed State does not leave recommendations empty.

### Preservation and failure handling

21. As a job-seeker, I want later startup to preserve my saved Profile edits, so that seed input does not overwrite application changes.
22. As a job-seeker, I want demo State seeded once rather than restored whenever a table is empty, so that intentionally removed decisions stay removed.
23. As a developer, I want cached source data and successful work retained after an interrupted bootstrap, so that the next run can complete missing stages.
24. As a developer, I want blank inputs, feed failures, and embedding failures reported without fabricated replacements, so that I can distinguish incomplete setup from a working demo.
25. As a developer, I want readiness checked for the target account and its derived data, so that nonempty tables belonging to unrelated data do not falsely satisfy bootstrap.

### Safety and verification

26. As a developer, I want private Resume content, credentials, caches, and account IDs excluded from committed data and logs, so that local setup does not expose sensitive information.
27. As a developer, I want fresh worktree setup to leave shared remote development vectors intact, so that another worktree's recommendations are not broken.
28. As a developer, I want production resources and authentication unchanged, so that a development convenience cannot modify deployed data or bypass Clerk verification.
29. As a developer, I want startup to explain missing configuration and incomplete required stages, so that it does not claim the demo is ready when setup failed.
30. As a developer, I want the actual startup and authenticated recommendation/history behavior exercised, so that passing internal tests alone does not stand in for a usable demo.

## Implementation Decisions

### Existing architecture and domain contracts

- Reuse the existing development launcher, Board registry, ingestion/normalization, Profile validation, Resume Embedding cache, Vectorize, Hard filter, and State modules. Do not create a second ingestion or embedding convention.
- Preserve the existing similarity-based Fit decision: Workers AI Embeddings, cosine Similarity, and response-time Fit. Fit is not persisted, and no judge-model scoring is introduced.
- Keep the existing embedding model, 768-dimensional cosine index, Opening-description truncation, and content-hash conventions. The development index remains `openings-dev`; production retains its existing index.
- Development bootstrap orchestration must not become an unauthenticated production endpoint. Existing public application routes retain Clerk verification and their current contracts.

### Source inputs and Profile creation

- Keep the supplied Resume in an ignored private input file populated with the actual supplied content. It must not be left blank or replaced with the shared synthetic test fixture.
- Cache live Opening source data locally before deriving database records and Embeddings. A fresh worktree fetches registered live Ashby Boards when it has no reusable local Opening input; incomplete bootstrap can reuse its cache.
- The Resume is the single source for initial Profile creation. Validate it with the existing Profile schema and retain the complete text after the existing outer-whitespace trimming.
- The Profile contains the resolved Clerk owner, that Resume text, and explicit filters. The current model does not require separate skills, education, or employment tables.
- Initial demo filters are Remote only, no location restriction, zero USD/INR compensation floors, Full-time, Senior+, and no excluded terms. These are demo checking values, not inferred job-search requirements.
- Generate the Resume Embedding from the exact text persisted in the Profile. Preserve an already saved Profile rather than overwriting it from seed input.

### Identity and schema

- Resolve the existing development Clerk account by the supplied Resume email using existing local development credentials and a read-only account lookup. Investigation found one matching development account; do not hardcode its ID in tracked data.
- Verify the Resume email against the resolved account. Use the Resume name/email for the local user record, without creating or modifying a Clerk account.
- Reuse the local account mapping after initial resolution. Do not query Clerk on every completed startup or scrape browser-session credentials.
- Align the local user primary key and State owner column with opaque Clerk string IDs through a forward migration that preserves existing records. Profile and Resume Embedding ownership already use string IDs.
- Apply pending migrations with migration history rather than blindly reapplying destructive historical migrations at every startup. Existing databases must be preserved when adopting this tracking.

### Table coverage and State

| Database | Domain table | Initial seed content |
| --- | --- | --- |
| Board registry database | `boards` | Existing live Ashby Board registry |
| Application database | `users` | Resolved development account's string ID, name, and email |
| Application database | `profile` | Supplied Resume and explicit demo filters under that account |
| Application database | `openings` | Normalized live Openings from registered Boards |
| Application database | `state` | Saved, applied, and dismissed examples referencing imported Openings |
| Application database | `resume_embeddings` | Real Resume vector and matching content hash |
| Application database | `opening_embeddings` | Description hashes for successfully indexed Openings |

- Removed scan, legacy vector, and persisted user-Fit tables must not be recreated. Framework and migration bookkeeping tables are not domain seed targets.
- Demo State is permitted on the current development account. It represents checking data, not actual submitted Applications; bootstrap does not submit an Application to any employer.
- Seed each of the three State statuses once using actual imported Opening IDs, while retaining available Survivors for recommendation checking. Record initial demo-State completion independently of current State row count.
- If the live input cannot support the requested State examples and available recommendations, report that limitation rather than inventing Openings or decisions.

### Worktree configuration and resource boundaries

- Discover the primary worktree from Git metadata. Existing worktree-local frontend/backend configuration wins; link only missing ignored development files to their existing primary-worktree counterparts.
- Never replace existing configuration or write through a link to modify the source. Missing configuration at both locations must produce a clear diagnostic.
- A new worktree may reuse the primary worktree's private Resume input, but owns its Opening cache, database state, and bootstrap bookkeeping. Do not copy or link another worktree's local Wrangler database storage.
- Configuration reuse is limited to development startup. No key values are committed, logged, or transferred to production. The server-side Clerk secret is not exposed to browser code.
- Document that edits to shared linked configuration affect linked worktrees.
- Workers AI and the existing development Vectorize index are remote and may consume quota. Do not clear that shared index while initializing a new worktree; local D1 isolation does not imply remote index isolation.
- Production D1, the production Vectorize index, deployment commands, and deployed configuration remain outside bootstrap.

### Readiness and idempotence

- Order bootstrap by its real dependencies: configuration/input resolution, pending schema changes, Board registry, account and Profile creation, Opening import, real Embedding/index completion, and initial demo State.
- Check readiness for the target account, its Profile/Resume hash, Opening records and derived index state, and initial demo-State completion. Merely finding a row in each table is insufficient.
- Repeated completed startup performs no unnecessary account lookup, feed refresh, or embedding/index writes. It preserves existing Profile edits, configuration overrides, and State.
- Resume or description hashes invalidate only corresponding stale Embeddings. Persist Opening Embedding completion only after the real vector operation succeeds.
- Preserve successful partial work and inspectable inputs so another startup can finish missing stages. Report Board-specific failures rather than silently discarding their outcomes.
- Required-stage failure leaves readiness incomplete and produces a clear diagnostic; do not fabricate vectors or claim the demo is ready.
- No custom retry framework, generic workflow engine, or additional provider is required.

## Testing Decisions

- Prefer one primary acceptance seam: the actual development launcher exercised in a fresh worktree and then exercised again with existing data. Observe local database records, preservation, completion, startup output, and the authenticated application results. This is the end-to-end verification scope already approved in the conversation.
- Use existing authenticated Profile, recommendation, and history API contracts as the observable downstream checks, rather than creating a new public seed API or asserting internal helper calls.
- Good permanent tests assert consumer-visible behavior, ownership, preservation, failure transitions, and isolation. Do not assert source text, copy operations, mock forwarding, incidental defaults, or implementation structure.
- Reuse existing Node test-runner, in-memory SQLite, generated signing-key authentication, and ingestion/embedding regression patterns.
- Cover initial Profile creation from the complete supplied Resume, account ownership, all three demo State statuses, and available recommendations after indexing.
- Cover a second startup preserving Profile edits and deliberately removed State without regenerating unchanged vectors or refetching solely because startup occurred.
- Cover existing local configuration precedence and independent worktree database state.
- Cover partial indexing failure leaving no false completion marker and a later startup completing only missing work.
- Cover Resume-version invalidation so the cached hash always describes the text used for that vector.
- Keep live feed calls, real credentials, and remote-resource writes out of the permanent deterministic suite. Use a separate real-resource smoke run for Workers AI, Vectorize, startup, and authenticated results.
- Run affected regression checks and the existing Worker typecheck before declaring implementation complete. Report unexercised remote behavior explicitly; tests alone are not proof of end-to-end readiness.

## Out of Scope

- Implementing this feature or producing an implementation plan as part of the specification delivery.
- Synthetic Opening generation or manual maintenance of live Board content.
- New Clerk accounts, browser-token scraping, authentication bypasses, or changes to production authentication/deployment.
- Structured Resume extraction, additional Profile fields, or invented salary/location requirements.
- A separate matching provider, judge-model Fit scoring, persisted Fit values, or resurrection of removed scan/vector tables.
- Copying local databases between worktrees, clearing shared remote development vectors, or writing production resources.
- Automatically submitting Applications, refreshing all live Boards on every completed startup, or introducing a generic retry/orchestration framework.

## Further Notes

- The conversation settled the use of the existing development account for demo State; no separate demo identity is required.
- Current startup only seeds the Board registry. Existing ingestion already imports and embeds live Openings, but automatic conditional startup bootstrap, private input reuse, account resolution, and worktree configuration reuse are not implemented.
- The existing Graphify graph contains references to a removed scan pipeline. Current sources and executed migrations were used to establish the seven-table scope and active API behavior.
- Applying the migrations to in-memory SQLite confirmed that opaque Clerk IDs cannot be inserted into the current integer user primary key. This is the reason for the scoped identity migration.
- A read-only Clerk lookup confirmed an existing development account matching the Resume email; no Clerk account was created or modified.
- The TypeScript resolver was smoke-checked while documenting verification commands. No application regression suite or real ingestion/embedding startup was run for this specification-only delivery.
- No unresolved product decisions remain within the approved scope. Implementation sequencing and concrete private-input locations belong to the subsequent implementation plan.
