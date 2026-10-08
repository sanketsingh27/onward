# Local development

## Start the app and backend

From the repository root:

```sh
./dev.sh
```

The launcher applies the Worker migrations to **local D1 only**, seeds the local board registry, then starts the local Worker and Next.js app together. Press `Ctrl-C` to stop both processes.

- Dashboard: `http://localhost:3000`
- Worker API: `http://127.0.0.1:8787`
- Local D1 databases and Queues: local Wrangler simulations
- Workers AI: remote Cloudflare binding
- Vectorize: remote `openings-dev` development index; deployed production keeps `openings`

Remote Workers AI and Vectorize operations use Cloudflare resources and may consume account quota or incur charges. Local D1 and Queues do not write to their deployed resources. Board ingestion still fetches the configured Ashby feeds over the network.

## One-time setup

1. Install dependencies: run `npm ci` in both `app/` and `worker/`.
2. Log in to Cloudflare with Wrangler (`cd worker && npx wrangler login`). Local mode uses remote Workers AI and the dedicated development Vectorize index.
3. Copy `worker/.dev.vars.development.example` to `worker/.dev.vars.development`. Set `CLERK_JWT_KEY` from the Clerk Dashboard and set `CLERK_AUTHORIZED_PARTIES` to the local app origin used in the browser, normally `http://localhost:3000`.
4. Ensure `app/.env.local` has the Clerk frontend keys for the same Clerk instance.

`.dev.vars.development` is ignored by Git. Never commit its real key values. The launcher warns, but does not stop, when this file is missing; health checks work, but authenticated API routes return 503 until Clerk auth is configured.

## Local data

The launcher initializes schema and board registry data in local Wrangler D1 storage. It does not seed a resume/profile or opening records. Running a scan requires a profile for the authenticated user's Clerk ID in the local `profile` table. Do not point the local Worker at production D1; local D1 is intentional.
