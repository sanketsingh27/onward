# Worker API

Base URL: the deployed Worker URL, or the local Wrangler URL (usually `http://localhost:8787`). All endpoints require `Authorization: Bearer <Clerk session token>` except `GET /health`.

Errors use JSON: `{ "error": "..." }`. Unexpected server errors return HTTP 500 with `{ "error": "internal server error", "requestId": "..." }`. Invalid JSON request bodies return HTTP 400.

## Health and board registry

| Method and path | Description | Success |
| --- | --- | --- |
| `GET /health` | Check that the Worker responds. Public endpoint. | `200 { "ok": true }` |
| `GET /boards` | List tracked boards and their feed metadata. | `200` array |

## Openings

| Method and path | Description | Success |
| --- | --- | --- |
| `GET /openings?limit=1..100` | Calculate and list available recommendations from the signed-in Profile's Vectorize recall. Applied and dismissed Openings are excluded; Fit is computed for this response and never stored. | `200 Opening[]` |
| `GET /openings/history?limit=1..100&cursor=<state-id>` | List the signed-in Profile's applied and dismissed Openings, newest state first. | `200 { data: (Opening & { state })[], nextCursor: string \| null }` |

## Profile

| Method and path | Description | Success |
| --- | --- | --- |
| `GET /profile` | Read the authenticated user's resume and matching filters. | `200 Profile`; `404` when no profile exists |
| `PUT /profile` | Create or replace the authenticated user's full profile. Body: `{ "resume": string, "filters": { "remote": "Remote only" \| "Hybrid ok" \| "Onsite ok", "locations": string[], "compFloorUsd": number, "compFloorInr": number, "employmentType": "Full-time" \| "Contract", "seniority": "Mid" \| "Senior" \| "Senior+" \| "Staff+", "excludeTerms": string[] } }`. | `200 Profile` |

## Opening state

| Method and path | Description | Success |
| --- | --- | --- |
| `GET /state` | List the signed-in user's saved, applied, and dismissed states. | `200` array |
| `PUT /state` | Set a state. Body: `{ "opening_id": "...", "status": "saved" | "applied" | "dismissed" }`. | `200 { "ok": true }` |


## Operations

| Method and path | Description | Success |
| --- | --- | --- |
| `POST /ingest` | Fetch and normalize postings from registered Boards, then embed only new or changed Opening descriptions. | `200` ingestion outcomes |
| `POST /embed` | Embed text. Body: `{ "texts": ["..."] }`. | `200 { "data": [...] }` |
| `POST /reason` | Generate a fit explanation. Body: `{ "resume": "...", "title": "...", "description": "..." }`; description is optional. | `200 { "reason": "..." }` |

From `worker/`, run `npm run dev:logs`. The Worker executes locally and prints JSON request logs. Local D1 bindings are used; Workers AI and the isolated `openings-dev` Vectorize index are remote. Remote AI usage may incur Cloudflare charges. The repository-root `./dev.sh` command starts the dashboard and Worker together with the dashboard API URL set to localhost.
