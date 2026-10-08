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
npx wrangler d1 execute onward-app   --remote --file ../migrations/0002_app.sql
```

## 4. Seed the board registry (remote)

```bash
npx wrangler d1 execute onward-boards --remote --file ../seed/seed.sql
```

## 5. Seed one user (single-user for now)

```bash
npx wrangler d1 execute onward-app --remote --command "INSERT OR IGNORE INTO users (id, email, name) VALUES (1, 'sanket@example.com', 'Sanket')"
```

## 6. Deploy

```bash
npx wrangler deploy
```

## Verify

`curl https://onward-worker.<your-subdomain>.workers.dev/boards` should return the ten boards.
