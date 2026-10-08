# Visual Docs Update Report

Workspace: `.`

## Changed source files

- `.visual-docs/`
- `CONTEXT.md`
- `MISSION.md`
- `NOTES.md`
- `PROVISIONING.md`
- `RESOURCES.md`
- `app/`
- `assets/`
- `dashboard/`
- `docs/`
- `fixtures/`
- `lessons/`
- `migrations/`
- `reference/`
- `seed/`
- `test/`
- `visual-docs.json`
- `worker/`

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

## Required agent pass

1. Re-read every changed source file.
2. Compare behavior, contracts, examples, diagrams, quizzes, and citations with affected lessons.
3. Revise stale lessons; add or narrow `sourceFiles` mappings in `visual-docs.json` when needed.
4. Regenerate the index with the configured command.
