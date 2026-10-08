# Commit Strategy

Use short-lived, issue-scoped branches and small, reviewable commits. Keep each commit green and make the history follow the dependency order of the user-facing work.

## Branch and issue order

The multi-user feature is sequenced by the GitHub issue dependencies:

1. `#22` — Google sign-in and protected sessions
2. `#23` — Resume and Filter onboarding
3. `#24` — personalized suggestions and owner-scoped Scans/results
4. `#25` — private per-user Opening State

Work one leaf issue at a time. Use a branch named for the issue, such as `feature/22-google-auth`; merge or otherwise integrate it before starting the next dependent issue. Keep `#21` as the parent tracking issue, not a mixed implementation branch. If the repository's default branch is not `main`, branch from its actual default.

## Commit boundaries

- Commit a complete behavior slice: implementation, its external-behavior regression tests, required schema migrations, and dependencies/lockfiles needed by that slice. Do not commit the intentional red test-first state; commit once the behavior is green.
- Keep an issue's implementation separate from a substantial documentation-only update. Use a `docs:` commit for lessons, references, provisioning instructions, and generated indexes. Small source-adjacent documentation edits may stay with the feature when splitting them would obscure the behavior.
- Keep separate tickets out of the same commit. Do not combine formatting, unrelated cleanup, or opportunistic refactors with ticket behavior.
- Prefer commits around 100–300 changed lines; split independent slices when practical. Do not split an inseparable feature or generated lockfile update just to meet a line count.
- Stage explicit paths. Never stage `.env.local`, Clerk keys, JWTs, PEM files, build output, or other local credentials.

## Suggested commit sequence

For the current `#22` work:

1. `feat(auth): verify Clerk sessions across the app and Worker (#22)` — Clerk dependencies and lockfiles, app session gate/sign-in/sign-up/sign-out, bearer-token forwarding, Worker JWT verification and verified-subject ownership, `.env.local` ignore rule, and auth-boundary tests.
2. `docs(auth): document Clerk setup and identity boundaries (#22)` — provisioning guidance, visual identity lesson, route/state/scan lesson corrections, glossary and route reference, visual-docs source mapping/index, and mission/resource updates. Commit the generated lesson index; include `.visual-docs/update-report.md` only if the repository chooses to track that report.

For later issues, use one behavior commit per ticket, then a separate `docs:` commit when the lesson/reference update is substantial:

- `feat(profile): add private Resume and Filter onboarding (#23)` — profile persistence/schema, onboarding behavior, replacement/update flow, and isolation tests.
- `feat(suggestions): isolate Fit and Scan results by owner (#24)` — user-specific results and Scan context/status enforcement, with personalized-result and cross-user tests.
- `feat(state): keep Opening decisions private per user (#25)` — set/clear behavior and independent State tests for users sharing an Opening.

A ticket may need multiple commits if its work contains independently reviewable behavior slices. All commits for a ticket remain on that ticket's branch and reference its issue number.

## Verification and pull requests

Before each behavior commit, run the relevant external-behavior tests, affected package typechecks/builds, and any required visual-doc check. Commit only passing checks; preserve the command and observed result in the PR description. Keep schema migrations and their consumers together in the same ticket branch.

Open one PR per leaf issue where practical. Link the issue, summarize user-visible behavior, list verification evidence, and disclose any remaining blocker. A code commit is a save point, not acceptance: do not close or merge an issue while a required runtime path or acceptance criterion remains unverified. In particular, `#22` still requires a real non-production Clerk Google configuration and the requested browser screenshot before its authentication acceptance is complete.

Use the existing GitHub issue workflow in [issue-tracker.md](issue-tracker.md). Commit message format: `<type>(<scope>): <intent> (#issue)`; use `feat`, `fix`, `test`, `docs`, `refactor`, or `chore` as appropriate.
