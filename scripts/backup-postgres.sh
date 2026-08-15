#!/usr/bin/env bash
set -euo pipefail

# Local PostgreSQL dump. No cloud database required.
# Usage: DATABASE_URL=postgresql://critterops:critterops@127.0.0.1:5432/critterops ./scripts/backup-postgres.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/critterops-$STAMP.sql"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install postgresql-client or run this on the shop Pi." >&2
  exit 1
fi

URL="${DATABASE_URL:-postgresql://critterops:critterops@127.0.0.1:5432/critterops}"
pg_dump --no-owner --no-acl "$URL" > "$FILE"
gzip -f "$FILE"

# Keep the last 14 dumps
ls -1t "$OUT_DIR"/critterops-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Wrote ${FILE}.gz"
