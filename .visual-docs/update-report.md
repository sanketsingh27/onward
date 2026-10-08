# Visual Docs Update Report

Workspace: `.`

## Changed source files

- `.visual-docs/update-report.md`
- `ESOURCES.md`
- `ISSION.md`
- `MISSION.md`
- `NOTES.md`
- `OTES.md`
- `PROVISIONING.md`
- `RESOURCES.md`
- `ROVISIONING.md`
- `app/.gitignore`
- `app/package-lock.json`
- `app/package.json`
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/app/sign-in/`
- `app/src/app/sign-up/`
- `app/src/components/Dashboard.tsx`
- `app/src/lib/api.ts`
- `app/src/middleware.ts`
- `docs/agent-orchestration-research.md`
- `eference/glossary.html`
- `eference/routes.html`
- `essons/0001-the-territory.html`
- `essons/0002-health-hono.html`
- `essons/0004-openings-ranked.html`
- `essons/0010-scan-queue.html`
- `essons/0011-state.html`
- `essons/0012-scheduled.html`
- `essons/index.html`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `isual-docs.json`
- `lessons/0001-the-territory.html`
- `lessons/0002-health-hono.html`
- `lessons/0004-openings-ranked.html`
- `lessons/0010-scan-queue.html`
- `lessons/0011-state.html`
- `lessons/0012-scheduled.html`
- `lessons/0013-authentication.html`
- `lessons/index.html`
- `orker/package-lock.json`
- `orker/package.json`
- `orker/src/env.ts`
- `orker/src/index.ts`
- `orker/src/scan/scan.ts`
- `orker/src/state/state.ts`
- `pp/package-lock.json`
- `pp/package.json`
- `pp/src/app/layout.tsx`
- `pp/src/app/page.tsx`
- `pp/src/components/Dashboard.tsx`
- `pp/src/lib/api.ts`
- `reference/glossary.html`
- `reference/routes.html`
- `test/auth.test.ts`
- `test/authenticated-ownership.test.ts`
- `visual-docs.json`
- `visual-docs/update-report.md`
- `worker/package-lock.json`
- `worker/package.json`
- `worker/src/env.ts`
- `worker/src/index.ts`
- `worker/src/scan/scan.ts`
- `worker/src/state/state.ts`

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
