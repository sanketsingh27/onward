# Local development

## Start the app and backend

From the repository root:

```sh
./dev.sh
```

The launcher resolves development configuration, applies pending migrations to **local D1 only**, seeds the local Board registry and creates a missing demo Profile from the private Resume, then starts the local Worker and Next.js app together. Historical migrations are adopted from the existing schema rather than repeatedly rebuilding tables. Press `Ctrl-C` to stop both processes.

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
4. Ensure `app/.env.local` has the Clerk frontend keys and server-side `CLERK_SECRET_KEY` for the same development Clerk instance. The secret is read only by the local bootstrap and is never exposed to browser code.

`.dev.vars.development` is ignored by Git. Never commit its real key values. Startup requires the frontend and backend development configuration to be present locally or available from the primary worktree.

### Git worktrees

If this worktree lacks `app/.env.local` or `worker/.dev.vars.development`, startup discovers the primary worktree through Git and links only the missing file to its existing counterpart. Existing local files take precedence. Missing configuration in both locations stops setup with a diagnostic; the launcher never prints key values.

Linked configuration is shared: editing a linked file changes the source used by every linked worktree. Create a separate local file when a worktree needs different settings. Each worktree keeps its own `.wrangler` databases; database storage is never copied or linked.

Run `./dev.sh schema` to resolve configuration and apply local schema/Board setup without starting servers or accessing remote bindings. Schema changes and their migration-history entry are committed together.


## Local data

Place the complete Resume in ignored `seed/.local/resume.md` once. Startup reads a worktree-local file first, otherwise the primary worktree's file. The contact header must contain the job-seeker's name and one email address; the existing development Clerk account is resolved by that email without creating another account.

Missing local user/Profile records are created under the verified Clerk ID. The initial filters are remote-only, no location restriction, zero compensation floors, full-time, Senior+, and no exclusions. These are demo filters, not requirements inferred from the Resume.

Startup stores an explicit local bootstrap owner mapping and preserves an existing saved Profile even when the source Resume changes. Resume Embeddings follow the exact text in the saved Profile: unchanged content reuses its real cached vector; a changed saved Resume is embedded using the remote development Workers AI binding. Missing input, ambiguous account lookup, or embedding failure leaves setup incomplete with a stage diagnostic.

Use `./dev.sh profile` for schema and Profile bootstrap without starting servers. `seed/.local/` and root/app environment files are ignored. Keep the primary Resume input ignored in older branches too; the shared Git exclusion can cover it until their ignore rules are updated. Do not copy or link D1 databases between worktrees.

Opening ingestion and demo State are separate bootstrap stages; they require actual Opening records and development Vectorize data. Local D1 is intentional—do not point the local Worker at production D1.
