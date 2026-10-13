# Onward — Cloudflare provisioning

The Worker code, migrations, and seed are written. These steps need **your** Cloudflare account and `wrangler` login — run them once, in order.

## 1. Install and log in

```bash
cd worker
npm install
npx wrangler login
```

## 2. Create the two D1 databases

```bash
npx wrangler d1 create onward-boards
npx wrangler d1 create onward-app
```

Copy each printed `database_id` into `worker/wrangler.jsonc`, replacing `REPLACE_WITH_BOARD_DB_ID` and `REPLACE_WITH_APP_DB_ID`.

## 3. Apply the schemas (remote)

```bash
npx wrangler d1 execute onward-boards --remote --file ../migrations/0001_boards.sql
npx wrangler d1 execute onward-app --remote --file ../migrations/0002_app.sql
for migration in 0003_vectors.sql 0004_profile.sql 0005_scans.sql 0006_resume_embeddings.sql 0007_user_opening_fits.sql 0008_dynamic_opening_results.sql 0009_profile_user_ids.sql; do
  npx wrangler d1 execute onward-app --remote --file "../migrations/$migration"
done
```

## 4. Seed the board registry (remote)

```bash
npx wrangler d1 execute onward-boards --remote --file ../seed/seed.sql
```

## 5. Deploy

```bash
npx wrangler deploy
```


## Verify

`curl https://onward-worker.<your-subdomain>.workers.dev/health` should return `{"ok":true}` without sign-in.

## Clerk authentication

Create a Clerk application and enable Google as the only sign-in method in its **User & Authentication → Social connections** and **Sign-in options** settings. The sign-in page uses Clerk's hosted-instance settings; Google provider credentials and allowed redirect URLs must be configured in Clerk, not in this repository.

Set these app variables in `app/.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

Set these Worker secrets/variables before deployment:

```bash
npx wrangler secret put CLERK_JWT_KEY
npx wrangler secret put CLERK_AUTHORIZED_PARTIES
```

Use the PEM public key from the Clerk instance's JWT key settings for `CLERK_JWT_KEY`. Set `CLERK_AUTHORIZED_PARTIES` to the comma-separated trusted app origins, for example `https://onward.example.com` (and the local development origin when needed). The Worker verifies the Clerk JWT signature and authorized party before using its `sub` as the user identity.
