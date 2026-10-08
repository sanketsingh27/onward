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
| `GET /openings` | List openings with fit greater than zero, sorted by fit descending. | `200` array |
| `GET /openings/ranked` | List ranked openings, excluding those the signed-in user applied to or dismissed. | `200` array |

## Opening state

| Method and path | Description | Success |
| --- | --- | --- |
| `GET /state` | List the signed-in user's saved, applied, and dismissed states. | `200` array |
| `PUT /state` | Set a state. Body: `{ "opening_id": "...", "status": "saved" | "applied" | "dismissed" }`. | `200 { "ok": true }` |

## Scans

| Method and path | Description | Success |
| --- | --- | --- |
| `POST /scan` | Queue a scan for the signed-in user. | `200 { "jobId": "..." }` |
| `GET /scan/:id` | Get the status and detail for a scan job. | `200` scan row; `404` if not found |

## Operations

| Method and path | Description | Success |
| --- | --- | --- |
| `POST /ingest` | Fetch and normalize postings from registered boards. | `200` ingestion outcomes |
| `POST /embed` | Embed text. Body: `{ "texts": ["..."] }`. | `200 { "data": [...] }` |
| `POST /score` | Recompute fit scores for eligible openings. | `200 { "scored": number }` |
| `POST /reason` | Generate a fit explanation. Body: `{ "resume": "...", "title": "...", "description": "..." }`; description is optional. | `200 { "reason": "..." }` |
| `POST /rank` | Rank openings against a resume. Body: `{ "resume": "...", "topN": 10 }`; topN is optional and positive. | `200 { "ranked": number }` |

## Local logs

From `worker/`, run `npm run dev:logs`. Wrangler starts the Worker locally and prints output in the terminal. The Worker emits one JSON request log per request plus JSON scan lifecycle events. Request logs include `requestId`, method, path, status, and duration; they do not include request bodies or authorization tokens. `--local` keeps this command independent of Cloudflare connectivity; Workers AI and Vectorize calls are unavailable in local mode.
