#!/usr/bin/env bash
# Imports backups/db-YYYY-MM-DD.sql into the running Postgres container.
# Run on the VPS after the stack is up: bash scripts/import-supabase-dump.sh path/to/dump.sql

set -euo pipefail

cd "$(dirname "$0")/.."

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to-sql-dump>" >&2
  echo "Hint: scp the file from your laptop:  scp backups/db-*.sql user@vps:meydan/" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env.prod

echo "==> Importing $DUMP into Postgres ($POSTGRES_DB as $POSTGRES_USER)"
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$DUMP"

echo "==> Rewriting Supabase Storage URLs → local /uploads paths"
# Any URL like https://<project>.supabase.co/storage/v1/object/public/<bucket>/...
# becomes ${PUBLIC_STORAGE_BASE_URL}/<bucket>/... so the app loads from nginx.
# PUBLIC_STORAGE_BASE_URL defaults to ${NEXTAUTH_URL}/uploads in docker-compose.prod.yml.
BASE="${NEXTAUTH_URL%/}/uploads"
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    UPDATE users
       SET avatar = regexp_replace(avatar,
             'https?://[^/]+/storage/v1/object/public', '$BASE')
     WHERE avatar LIKE '%/storage/v1/object/public/%';
    UPDATE fields
       SET photos = ARRAY(
             SELECT regexp_replace(p,
               'https?://[^/]+/storage/v1/object/public', '$BASE')
               FROM unnest(photos) p)
     WHERE EXISTS (SELECT 1 FROM unnest(photos) p
                    WHERE p LIKE '%/storage/v1/object/public/%');
  "

echo "==> Done. Verify with:"
echo "  docker compose -f docker-compose.prod.yml exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT count(*) FROM users;'"
