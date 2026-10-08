# Mission: Learn the job-matching design of the `onward-worker`

## Why
I want to understand how a system decides which job openings match a candidate — the embed → filter → score → rank pipeline — by studying the real `worker/` code in this repo. Working through each API call and module is how I learn the design well enough to reason about it, and eventually modify it, with confidence.

## Success looks like
- Explain the Clerk session boundary between the Next.js dashboard and the Worker, including how verified identity becomes a user key.
- Identify which user-facing routes are public, authenticated, and owner-scoped.
- Configure the Clerk app and Worker verification environment without embedding credentials in source.
- Explain for every HTTP route in `worker/src/index.ts` what it does, what it calls, and what it returns.
- Trace one job opening end-to-end: board feed → normalized row → hard filter → embedding → similarity score → ranked list with an LLM-written reason.
- Name the five Cloudflare bindings (two D1 databases, Workers AI, Vectorize, a Queue) and what each contributes to the pipeline.
- Describe what an embedding is and how cosine similarity turns two texts into a match score.

## Constraints
- New to Cloudflare Workers: each lesson must introduce the Cloudflare primitive before showing how the code uses it.
- Interactive, HTML lessons with immediate-feedback quizzes; diagrams where a visual beats prose.
- Route-by-route order (my choice), starting from the big picture.

## Out of scope
- Writing/deploying Workers from scratch (a later mission).
- Retraining or tuning the embedding/LLM models.
- The rest of the repo outside the app/Worker authentication boundary — only enough frontend context to understand sign-in, session tokens, and user identity.
