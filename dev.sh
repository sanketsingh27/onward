#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$ROOT_DIR/worker"
APP_DIR="$ROOT_DIR/app"
WRANGLER="$WORKER_DIR/node_modules/.bin/wrangler"
NEXT="$APP_DIR/node_modules/.bin/next"

if [[ ! -x "$WRANGLER" || ! -x "$NEXT" ]]; then
  printf 'Install app and Worker dependencies first: npm ci in app/ and worker/\n' >&2
  exit 1
fi

for port in 3000 8787; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf 'Port %s is already in use. Stop that process, then rerun ./dev.sh.\n' "$port" >&2
    exit 1
  fi
done

run_wrangler() {
  (cd "$WORKER_DIR" && "$WRANGLER" "$@")
}

# Bootstrap local D1 databases only; never pass --remote here.
run_wrangler d1 execute onward-boards --local --file "$ROOT_DIR/migrations/0001_boards.sql"
for migration in 0002_app.sql 0003_vectors.sql 0004_profile.sql 0005_scans.sql 0006_resume_embeddings.sql 0007_user_opening_fits.sql; do
  run_wrangler d1 execute onward-app --local --file "$ROOT_DIR/migrations/$migration"
done
run_wrangler d1 execute onward-boards --local --file "$ROOT_DIR/seed/seed.sql"

if [[ ! -f "$WORKER_DIR/.dev.vars.development" ]]; then
  printf '\nWorker auth is not configured. Copy worker/.dev.vars.development.example to worker/.dev.vars.development and fill in the Clerk values to use authenticated API routes.\n\n' >&2
fi

run_worker() {
  local status=0
  (cd "$WORKER_DIR" && npm run dev:logs) || status=$?
  printf '%s\n' "$status" > "$status_dir/worker"
}

run_app() {
  local status=0
  (
    cd "$APP_DIR"
    export NEXT_PUBLIC_WORKER_URL="http://127.0.0.1:8787"
    npm run dev
  ) || status=$?
  printf '%s\n' "$status" > "$status_dir/app"
}

stop_tree() {
  local parent="$1"
  local child
  for child in $(pgrep -P "$parent" 2>/dev/null || true); do
    stop_tree "$child"
  done
  kill "$parent" 2>/dev/null || true
}

status_dir="$(mktemp -d "${TMPDIR:-/tmp}/onward-dev.XXXXXX")"
cleanup() {
  trap - INT TERM EXIT
  if [[ -n "${worker_pid:-}" ]]; then stop_tree "$worker_pid"; fi
  if [[ -n "${app_pid:-}" ]]; then stop_tree "$app_pid"; fi
  if [[ -n "${worker_pid:-}" ]]; then wait "$worker_pid" 2>/dev/null || true; fi
  if [[ -n "${app_pid:-}" ]]; then wait "$app_pid" 2>/dev/null || true; fi
  rm -f "$status_dir/worker" "$status_dir/app"
  rmdir "$status_dir" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

run_worker &
worker_pid=$!
run_app &
app_pid=$!

printf '\nStarting local development. Dashboard: http://localhost:3000  Worker: http://127.0.0.1:8787\nPress Ctrl-C to stop both.\n\n'
while [[ ! -f "$status_dir/worker" && ! -f "$status_dir/app" ]]; do
  sleep 1
done

if [[ -f "$status_dir/worker" ]]; then
  read -r exit_code < "$status_dir/worker"
else
  read -r exit_code < "$status_dir/app"
fi
exit "$exit_code"
