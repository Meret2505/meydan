#!/usr/bin/env bash
# First-time TLS setup on the VPS. Run after the docker compose stack is up
# but BEFORE you point users at the domain — this hits Let's Encrypt.
#
# Prereqs:
#   - DNS A record for $DOMAIN points at the VPS public IP
#   - docker compose stack is running (nginx serving on :80 is enough)
#   - .env.prod has DOMAIN and LETSENCRYPT_EMAIL set
#
# Idempotent: safe to re-run; certbot will just say "Certificate already exists".

set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source .env.prod

if [[ -z "${DOMAIN:-}" || -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "DOMAIN and LETSENCRYPT_EMAIL must be set in .env.prod" >&2
  exit 1
fi

echo "==> Substituting domain in nginx config"
mkdir -p nginx/conf.d
envsubst '${DOMAIN}' \
  < nginx/conf.d/meydan.conf.template \
  > nginx/conf.d/meydan.conf

# Until the cert exists, nginx will refuse to start the :443 block. Drop a
# self-signed placeholder so nginx can come up, then certbot replaces it.
CERT_DIR=$(docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh nginx -c "echo /etc/letsencrypt/live/$DOMAIN")
if ! docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh nginx -c "test -f $CERT_DIR/fullchain.pem"; then
  echo "==> Generating self-signed bootstrap cert"
  docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh certbot -c "
    apk add --no-cache openssl >/dev/null 2>&1 || true
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    openssl req -x509 -newkey rsa:2048 -days 1 -nodes \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
      -subj '/CN=$DOMAIN'
  "
fi

echo "==> Starting/reloading nginx"
docker compose -f docker-compose.prod.yml up -d nginx
sleep 2

echo "==> Requesting real Let's Encrypt cert"
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN" --force-renewal

echo "==> Reloading nginx with real cert"
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "==> Done. https://$DOMAIN should now serve a valid cert."
