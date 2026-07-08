#!/usr/bin/env bash
# Nightly backup of the Meydan Postgres DB + uploaded files.
#
# Runs on the VPS — assumes docker-compose.prod.yml is in /opt/meydan (override
# via MEYDAN_DIR env var). Writes timestamped, compressed dumps to BACKUP_DIR.
# Prunes anything older than RETENTION_DAYS.
#
# Suggested cron (as root):
#   30 3 * * * /opt/meydan/scripts/backup.sh >> /var/log/meydan-backup.log 2>&1
#
# For offsite copies, follow the rsync/restic example at the bottom of
# DEPLOY-VPS.md — relying on a single local copy is not a backup.

set -euo pipefail

MEYDAN_DIR="${MEYDAN_DIR:-/opt/meydan}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/meydan}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$MEYDAN_DIR"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DB_OUT="$BACKUP_DIR/db/meydan-$STAMP.sql.gz"
UP_OUT="$BACKUP_DIR/uploads/meydan-uploads-$STAMP.tar.gz"

# --- Postgres ---
# Read DB credentials from the compose env so a password change in one place
# doesn't silently break the backup.
export $(grep -E '^(POSTGRES_USER|POSTGRES_DB)=' .env.prod | xargs)
POSTGRES_USER="${POSTGRES_USER:-meydan}"
POSTGRES_DB="${POSTGRES_DB:-meydan}"

echo "[$(date -Iseconds)] pg_dump -> $DB_OUT"
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --no-owner --no-privileges --clean --if-exists \
  | gzip -9 > "$DB_OUT"

# Fail loudly if the dump came back empty — silent zero-byte backups are
# worse than no backups.
if [[ ! -s "$DB_OUT" ]]; then
  echo "ERROR: empty dump $DB_OUT" >&2
  rm -f "$DB_OUT"
  exit 1
fi

# --- Uploaded files ---
# tar the uploads volume by mounting it into a throwaway container.
echo "[$(date -Iseconds)] uploads -> $UP_OUT"
docker run --rm \
  -v meydan_uploads:/data:ro \
  -v "$BACKUP_DIR/uploads:/out" \
  alpine \
  tar czf "/out/meydan-uploads-$STAMP.tar.gz" -C /data .

# --- Prune ---
find "$BACKUP_DIR/db" -name "meydan-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR/uploads" -name "meydan-uploads-*.tar.gz" -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -Iseconds)] done. db=$(du -h "$DB_OUT" | cut -f1) uploads=$(du -h "$UP_OUT" | cut -f1)"
