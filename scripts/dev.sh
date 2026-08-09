#!/usr/bin/env bash
# Boots a local Soul dev instance with a ready-to-use superuser.
#
# The initial user Soul creates is never a superuser by default -- there's
# no flag to create one directly, it has to be promoted via the
# `updatesuperuser` CLI command after the fact, against the same DB file
# (not :memory:, since a separate process can't reach another process's
# in-memory db). On first run this script does that dance once; on later
# runs the DB already has a superuser, so it just starts the server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DB_PATH="${SOUL_DEV_DB:-$ROOT/.dev.db}"
PORT="${SOUL_DEV_PORT:-8000}"
TOKEN_SECRET="${SOUL_DEV_TOKEN_SECRET:-dev-only-secret-not-for-production}"
USERNAME="${SOUL_DEV_USERNAME:-admin}"
PASSWORD="${SOUL_DEV_PASSWORD:-Str0ngTestPw!1}"
CORS_ORIGIN="${SOUL_DEV_CORS_ORIGIN:-http://localhost:3000}"

# Studio runs on a different port -- cross-origin cookie auth needs these
# (see COOKIE_SAMESITE/COOKIE_SECURE in src/config/index.js).
export COOKIE_SAMESITE="${SOUL_DEV_COOKIE_SAMESITE:-none}"
export COOKIE_SECURE="${SOUL_DEV_COOKIE_SECURE:-true}"

SERVER_ARGS=(
  src/server.js
  -d "$DB_PATH"
  -p "$PORT"
  -a
  --ts "$TOKEN_SECRET"
  --iuu "$USERNAME"
  --iup "$PASSWORD"
  --cors "$CORS_ORIGIN"
)

if [[ ! -f "$DB_PATH" ]]; then
  echo "==> First run: creating $USERNAME and promoting to superuser..."

  node "${SERVER_ARGS[@]}" &
  SERVER_PID=$!
  for i in $(seq 1 30); do
    curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1 && break
    sleep 0.5
  done
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true

  # updatesuperuser exits 1 on success (existing, harmless CLI quirk) --
  # `|| true` so `set -e` doesn't treat that as a real failure. Checked by
  # output text instead of exit code.
  PROMOTE_OUTPUT="$(node src/server.js updatesuperuser --id=1 --is_superuser=true -d "$DB_PATH" 2>&1 || true)"
  echo "$PROMOTE_OUTPUT"
  if [[ "$PROMOTE_OUTPUT" != *"updated successfully"* ]]; then
    echo "==> Failed to promote $USERNAME to superuser, aborting." >&2
    rm -f "$DB_PATH"
    exit 1
  fi

  echo "==> $USERNAME / $PASSWORD is now a superuser. Starting for real..."
fi

exec node "${SERVER_ARGS[@]}"
