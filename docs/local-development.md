# Local development

## Start the app and backend

From the repository root:

```sh
./dev.sh
```

The launcher resolves development configuration, applies pending migrations to **local D1 only**, seeds the local Board registry, then starts the local Worker and Next.js app together. Historical migrations are adopted from the existing schema rather than repeatedly rebuilding tables. Press `Ctrl-C` to stop both processes.

- Dashboard: `http://localhost:3000`
- Worker API: `http://127.0.0.1:8787`
- Local D1 databases and Queues: local Wrangler simulations
- Workers AI: remote Cloudflare binding
- Vectorize: remote `openings-dev` development index; deployed production keeps `openings`

Remote Workers AI and Vectorize operations use Cloudflare resources and may consume account quota or incur charges. Local D1 and Queues do not write to their deployed resources. Board ingestion still fetches the configured Ashby feeds over the network.

## Authentication

- `/sign-in` and `/sign-up` are public Clerk routes rendered on the blurred authentication shell.
- A signed-in request to `/sign-in` or `/sign-up` redirects to `/` on the server before Clerk renders an auth form. The guard keeps the single-session policy.
- The dashboard (`/`) requires an active Clerk session. A signed-out document request redirects to `/sign-in`; signing out returns there too.
- The Worker verifies the Clerk bearer token for every route except `/health`; absent or invalid credentials receive `401`.

## One-time setup

1. Install dependencies: run `npm ci` in both `app/` and `worker/`.
2. Log in to Cloudflare with Wrangler (`cd worker && npx wrangler login`). Local mode uses remote Workers AI and the dedicated development Vectorize index.
3. Create `worker/.dev.vars.development` (or reuse it from the primary worktree). Set `CLERK_JWT_KEY` from the Clerk Dashboard and set `CLERK_AUTHORIZED_PARTIES` to the local app origin used in the browser, normally `http://localhost:3000`.
4. Ensure `app/.env.local` has the Clerk frontend keys for the same Clerk instance.

`.dev.vars.development` is ignored by Git. Never commit its real key values. Startup requires the frontend and backend development configuration to be present locally or available from the primary worktree.

### Git worktrees

If this worktree lacks `app/.env.local` or `worker/.dev.vars.development`, startup discovers the primary worktree through Git and links only the missing file to its existing counterpart. Existing local files take precedence. Missing configuration in both locations stops setup with a diagnostic; the launcher never prints key values.

Linked configuration is shared: editing a linked file changes the source used by every linked worktree. Create a separate local file when a worktree needs different settings. Each worktree keeps its own `.wrangler` databases; database storage is never copied or linked.

Run `./dev.sh schema` to resolve configuration and apply local schema/Board setup without starting servers or accessing remote bindings. Schema changes and their migration-history entry are committed together.


## Local data

The launcher initializes schema and board registry data in local Wrangler D1 storage. It does not seed a resume/profile or opening records. After signing in, the dashboard shows the profile form; saving it writes your resume and preferences under the authenticated Clerk user ID. Running a scan still requires opening records in local D1. Do not point the local Worker at production D1; local D1 is intentional.
