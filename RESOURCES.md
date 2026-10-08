# Job-Matching Design (onward-worker) Resources

## Knowledge

- [Docs: Cloudflare Workers AI — bge-base-en-v1.5](https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/)
  The embedding model this worker uses (`@cf/baai/bge-base-en-v1.5`, 768-dim). Use for: what an embedding is, input/output shape, the `data` response field.
- [Article: "What are embeddings?" — Vicki Boykis](https://vickiboykis.com/what_are_embeddings/)
  The best plain-language explainer of how text becomes vectors. Use for: intuition that similarity = distance in vector space.
- [Docs: Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
  The vector index the worker queries for similarity. Use for: `upsert`/`query`, the cosine metric, `topK`.
- [Docs: Cloudflare D1](https://developers.cloudflare.com/d1/)
  SQLite at the edge (`BOARD_DB`, `APP_DB`). Use for: `prepare`/`bind`/`all`/`batch` and the Worker database API.
- [Docs: Cloudflare Queues](https://developers.cloudflare.com/queues/)
  The async job queue (`SCAN_QUEUE`). Use for: producers, the `queue()` consumer, at-least-once delivery.
- [Docs: Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
  The web framework for routing. Use for: `app.get`/`app.post`, `c.env`, `c.json`.
- [Docs: Workers AI — llama-3.1-8b-instruct-fp8](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/)
  The LLM that writes match reasons. Use for: the `messages` input and `{ response }` output shape.
- [Docs: Ashby Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api)
  The upstream feed the worker ingests. Use for: the raw `jobs[]` JSON shape and its fields.

## Wisdom (Communities)

- [Cloudflare Developers Discord](https://discord.cloudflare.com)
  Active, well-moderated; workers/d1/ai channels. Use for: binding troubleshooting, Workers AI quirks, design feedback.
- [r/CloudFlare](https://reddit.com/r/CloudFlare)
  High-signal for real-world Worker patterns and gotchas. Use for: architecture review and deployment edge cases.

## Gaps

- No single canonical article explains "job-matching as embed → filter → score → rank" as a pattern. This workspace's lessons are assembling that synthesis from the sources above.
