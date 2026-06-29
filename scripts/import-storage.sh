#!/usr/bin/env bash
# Copies backups/storage/<bucket>/... into the `uploads` Docker volume so
# nginx serves the files at /uploads/<bucket>/... matching the rewritten URLs.

set -euo pipefail

cd "$(dirname "$0")/.."

SRC="${1:-backups/storage}"
if [[ ! -d "$SRC" ]]; then
  echo "Usage: $0 [path-to-storage-backup-dir]   (default: backups/storage)" >&2
  exit 1
fi

echo "==> Copying $SRC → uploads volume"

# Find the actual volume mount path on the host. Docker prefixes with project name.
VOLUME="$(docker compose -f docker-compose.prod.yml ps -q app 2>/dev/null | head -1)"
if [[ -z "$VOLUME" ]]; then
  echo "App container not running. Start the stack first: docker compose -f docker-compose.prod.yml up -d" >&2
  exit 1
fi

# Easiest: tar-pipe through the container so we don't care where Docker mounts the volume.
tar -C "$SRC" -cf - . | \
  docker compose -f docker-compose.prod.yml exec -T app sh -c 'mkdir -p /app/uploads && tar -C /app/uploads -xf -'

echo "==> Done. Verify with:"
echo "  docker compose -f docker-compose.prod.yml exec app ls -la /app/uploads"
