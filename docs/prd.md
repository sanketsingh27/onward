# PRD: Onward — fetch Ashby openings, rank by semantic fit, track applications

## Problem Statement

Sanket is job-searching across many companies that use Ashby as their ATS. Today that means manually visiting each company's careers page, reading every posting, deciding whether it is worth applying to, and trying to remember which ones he has already applied to or dismissed. Across ten boards there are roughly seven thousand open roles at any moment — the overwhelming majority irrelevant — and there is no memory of what has already been seen. The work is slow, repetitive, and error-prone.

## Solution

Onward is a single-user tool on Cloudflare that pulls every open role from the boards the user tracks, drops the ones that fail his hard requirements, embeds the survivors and ranks them by how semantically similar they are to his resume, and shows that ranked list in a dashboard where he applies manually and tracks state (applied, dismissed, saved). It answers, in one screen, "who is my best match right now, and by how much?"

## User Stories

1. As a job-seeker, I want the tool to fetch every open role from all of my boards, so that I don't miss an opening.
2. As a job-seeker, I want a scan to pick up newly posted roles and drop closed ones, so that the list reflects what is actually open.
3. As a job-seeker, I want roles that are no longer listed to disappear on the next scan, so that I don't apply to closed roles.
4. As a job-seeker, I want to filter to remote-only roles, so that I only see roles I can actually take.
5. As a job-seeker, I want to filter by location, so that on-site and hybrid roles are within reach.
6. As a job-seeker, I want to set a compensation floor in both USD and INR, so that I only see roles that pay enough, matched on the posting's own currency.
7. As a job-seeker, I want to filter by employment type, so that I only see the engagements I want (full-time vs contract).
8. As a job-seeker, I want openings ranked by how semantically similar they are to my resume, so that relevant roles surface even when the title or wording differs from mine.
9. As a job-seeker, I want my skills captured by the semantic match, so that openings describing the same skills with different words still surface.
10. As a job-seeker, I want to filter to my target seniority, so that I don't see roles clearly above or below my level.
11. As a job-seeker, I want to exclude terms such as "visa sponsorship" or "security clearance", so that unsuitable roles are flagged rather than hidden.
12. As a job-seeker, I want each surviving role given a 0–100 fit, so that I can rank them.
13. As a job-seeker, I want to see why an opening matched, so that I can judge it at a glance.
14. As a job-seeker, I want a one-line reason for the top matches, so that I can judge a role at a glance.
15. As a job-seeker, I want the list ranked by fit, so that the best match is always first.
16. As a job-seeker, I want to see the company, title, location, workplace type and compensation for each role, so that I can judge it without opening it.
17. As a job-seeker, I want a deep link to each role's Ashby application page, so that I can apply in one click.
18. As a job-seeker, I want to shortlist a role, so that I can return to it later.
19. As a job-seeker, I want to mark a role applied, so that it stops surfacing in future scans and I have a record I acted on it.
20. As a job-seeker, I want to dismiss a role, so that it is hidden from future scans but kept in the record.
21. As a job-seeker, I want applied/dismissed/saved state to persist between runs, so that I don't re-review the same roles.
22. As a job-seeker, I want a first-run empty state, so that I understand nothing has been scanned and how to start.
23. As a job-seeker, I want a loading state during a scan, so that I know the tool is working.
24. As a job-seeker, I want an error state when a board fails to load, so that I know what went wrong and what to do.
25. As a job-seeker, I want a "Run scan" button that starts a scan, so that I can refresh on demand.
26. As a job-seeker, I want to re-run a scan, so that I get fresh openings whenever I choose.
27. As a job-seeker, I want my job-search data stored privately under my own account, so that it isn't shared with anyone else.
28. As a job-seeker, I want to maintain my resume as a markdown file, so that it is the single source of truth for matching.
29. As a job-seeker, I want my profile filters editable in the dashboard, so that I can adjust my criteria without touching code.
30. As a job-seeker, I want to manage the list of boards the tool tracks, so that I can add or remove companies.
31. As a job-seeker, I want a shortlist view, so that I can see only the roles I have saved to act on.

## Implementation Decisions

- **Stack.** Frontend in Next.js (App Router) deployed to Cloudflare via `@opennextjs/cloudflare`; backend in Hono on Cloudflare Workers; relational data in D1; embeddings and similarity search in Vectorize with embeddings from Workers AI. The existing Vite prototype is replaced.
- **Two databases, four tables.** The board registry is its own D1 database with a `boards` table. The application D1 database holds `users`, `openings`, and `state` — state keyed per user.

  ```
  boards   { slug, companyName, feedUrl, ats, lastFetchedAt }
  users    { id, email, name }
  openings { id, board, company, title, location, remote, compensation…, employmentType, publishedAt, applyUrl, descriptionPlain, fit, reason }
  state    { id, userId, openingId, status, updatedAt }   // status ∈ saved | applied | dismissed
  ```
- **Board registry.** A separate D1 database stores the boards the tool tracks — slug, company name, feed URL, ATS — seeded from `links.csv`. Version one tracks the `ashby` ATS only.
- **Ingestion.** Fetch each board's feed URL, normalize every posting into a single internal `Opening` shape, and drop postings whose `isListed` is false. Ashby returns one JSON document per board with no pagination.
- **Normalized opening shape.** The internal record a posting maps to:

  ```
  Opening {
    id, board, company, title,
    location, secondaryLocations,
    remote,               // derived from workplaceType/isRemote
    compensation: { currency, salaryMin, salaryMax, equityMin, equityMax, bonus },
    employmentType, publishedAt, applyUrl, descriptionPlain,
    fit                   // cosine similarity vs the resume, 0–100
  }
  ```

- **Profile.** Two parts: a `resume.md` (frontmatter: name, email, phone, location, target_title, years_experience) plus dashboard filters: remote preference, locations, comp floor USD, comp floor INR, employment type, target seniority, exclude terms.
- **Hard filter.** Strict drops, applied before embedding: remote, location, compensation (matched on the posting's currency), and employment type. Target seniority is a hard filter on the title. `exclude terms` are a flag (badge), not a drop.
- **Scoring.** The resume and each survivor's description are embedded; fit is the cosine similarity between the resume vector and the opening vector, mapped to 0–100. Openings rank by fit descending. A one-line reason is produced by a general LLM for the top-N openings only.
- **Scan as a background job.** A scan (fetch → filter → embed → rank) runs as a background job — triggered by a cron schedule or by the dashboard's Run / Re-run scan button — and writes results to D1. The API and dashboard only read D1; they never run a scan synchronously.
- **State.** The `state` table records, per user, which openings are `saved`, `applied`, or `dismissed` (keyed by user id and opening id). State survives between scans; an opening the user has applied to or dismissed is excluded from the next scan's results.
- **Apply handoff.** Each opening links to its Ashby `applyUrl`; applying is a human action the tool hands off to, not something it does.

## Testing Decisions

- **What makes a good test.** Assert external behavior only: given a fixture set of openings and a profile, assert which openings survive, how they rank, and how state changes. Never assert on internal wiring or the transport.
- **Ingestion.** Normalize committed fixture Ashby JSON to the `Opening` shape; assert field mapping and that unlisted postings are dropped.
- **Hard filter.** A pure function; test each filter independently (remote, location, comp across currencies, employment, seniority) plus the combined drop order.
- **Scoring.** The similarity ranking is tested with mock embeddings: assert the top-K recall and the descending order, and that fit maps onto 0–100. The embedding and Vectorize calls are the external dependencies and are mocked at the seam.
- **State.** Test applied/dismissed/saved CRUD against a temporary D1 database; assert that a marked-applied opening is excluded from the next scan's survivors.
- **Scan job.** End-to-end: enqueue a scan against fixture data and assert the ranked results land in D1.
- **Prior art.** The repository is greenfield — no existing test suite or harness to follow. Tests introduce the first harness.

## Out of Scope

- Auto-apply and the browser extension (a future effort).
- Non-Ashby ATS types (greenhouse, lever, personio, recruitee, smartrecruiters).
- Cover letters and free-text screening-question answers.
- Normalizing company display names (board slugs are shown as-is for now).

## Further Notes

- Single user, hosted on the user's own Cloudflare account; the human is the only actor and applies manually.
- Secrets are the LLM key (for the top-N reason) only — the Jev key is no longer needed since scoring moved to embeddings. Both are configured as secrets, never committed.
- Workers AI provides the embedding model (default `bge-base`, 768 dimensions) and runs within the free tier for small workloads.
