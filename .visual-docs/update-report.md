# Visual Docs Update Report

Workspace: `.`

## Changed source files

- `.github/`
- `PROVISIONING.md`
- `RESOURCES.md`
- `RESUME_VECTOR_LOOKUP_PLAN.md`
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/app/sign-in/[[...sign-in]]/page.tsx`
- `app/src/app/sign-up/[[...sign-up]]/page.tsx`
- `app/src/components/AuthShell.tsx`
- `app/src/components/Dashboard.tsx`
- `app/src/components/JobRow.tsx`
- `app/src/components/Sidebar.tsx`
- `app/src/components/States.tsx`
- `app/src/lib/api.ts`
- `app/src/lib/openings.ts`
- `dev.sh`
- `docs/agent-orchestration-research.md`
- `docs/clerk-sign-in-redirect-plan.html`
- `docs/clerk-sign-in-redirect-plan.packed.html`
- `docs/contract.md`
- `docs/local-development.md`
- `docs/worker-api.md`
- `eed/profile.sql`
- `est/user-fit-api.test.ts`
- `igrations/0007_user_opening_fits.sql`
- `igrations/0008_dynamic_opening_results.sql`
- `migrations/0006_resume_embeddings.sql`
- `migrations/0007_user_opening_fits.sql`
- `migrations/0008_dynamic_opening_results.sql`
- `ocs/local-development.md`
- `orker/.dev.vars.development.example`
- `pp/src/app/layout.tsx`
- `pp/src/app/page.tsx`
- `pp/src/app/sign-in/[[...sign-in]]/page.tsx`
- `pp/src/app/sign-up/[[...sign-up]]/page.tsx`
- `pp/src/components/Dashboard.tsx`
- `seed/profile.sql`
- `test/auth.test.ts`
- `test/authenticated-ownership.test.ts`
- `test/embed.test.ts`
- `test/filter.test.ts`
- `test/ingest-index.test.ts`
- `test/ingest.test.ts`
- `test/scan-resume-embedding.test.ts`
- `test/user-fit-api.test.ts`
- `test/user-fit.test.ts`
- `worker/.dev.vars.development.example`
- `worker/src/api/schemas.ts`
- `worker/src/embed/embed.ts`
- `worker/src/fit/fit.ts`
- `worker/src/index.ts`
- `worker/src/ingest/ingest.ts`
- `worker/src/ingest/normalize.ts`
- `worker/src/rank/rank.ts`
- `worker/src/routes/openings.ts`
- `worker/src/routes/operations.ts`
- `worker/src/routes/scans.ts`
- `worker/src/scan/scan.ts`
- `worker/src/vector/vector.ts`
- `worker/worker-configuration.d.ts`
- `worker/wrangler.jsonc`

## Affected lessons

- **Update needed:** [The territory: what this Worker is](lessons/0001-the-territory.html)
- **Update needed:** [GET /health: your first request](lessons/0002-health-hono.html)
- **Update needed:** [GET /boards: reading configuration](lessons/0003-read-boards.html)
- **Update needed:** [/openings: showing scored jobs](lessons/0004-openings-ranked.html)
- **Update needed:** [POST /ingest: from board feed to opening row](lessons/0005-ingest.html)
- **Update needed:** [The hard filter: rules before similarity](lessons/0006-hard-filter.html)
- **Update needed:** [POST /embed: meaning as numbers](lessons/0007-embed.html)
- **Update needed:** [POST /score: nearest vectors become fit](lessons/0008-score.html)
- **Update needed:** [/reason and /rank: explain the match](lessons/0009-reason-rank.html)
- **Update needed:** [POST /scan: request the whole pipeline](lessons/0010-scan-queue.html)
- **Update needed:** [PUT /state and GET /state](lessons/0011-state.html)
- **Update needed:** [The scheduled handler: a daily refresh](lessons/0012-scheduled.html)
- **Update needed:** [From Clerk session to Worker identity](lessons/0013-authentication.html)

## Required agent pass

1. Re-read every changed source file.
2. Compare behavior, contracts, examples, diagrams, quizzes, and citations with affected lessons.
3. Revise stale lessons; add or narrow `sourceFiles` mappings in `visual-docs.json` when needed.
4. Regenerate the index with the configured command.
