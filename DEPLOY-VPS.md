# Deploying Meydan on your own VPS

End-to-end runbook for moving Meydan off Vercel + Supabase onto a self-hosted
Ubuntu/Debian VPS with Docker Compose. Designed for the Turkmenistan-blocked-
service problem: once it's up, your users hit the VPS directly, no Vercel and
no Supabase domains involved.

## What you'll have running

```
       ┌──────────────────┐
       │      nginx       │  :80 (ACME) + :443 (TLS)
       └────────┬─────────┘
        ┌───────┴────────┐
        ▼                ▼
 ┌──────────────┐  /uploads/*  (alias → uploads volume)
 │  Next.js app │  port 3000 internal
 └──────┬───────┘
        ▼
 ┌──────────────┐
 │  Postgres 17 │  port 5432 internal only
 └──────────────┘
```

All four services run from a single `docker compose -f docker-compose.prod.yml up -d`.

## One-time VPS setup

1. **SSH in as root** (or a sudoer).
2. **Install Docker + Compose plugin:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   apt install -y docker-compose-plugin git
   ```
3. **Clone the repo:**
   ```bash
   cd /opt
   git clone git@github.com:Meret2505/meydan.git
   cd meydan
   ```
4. **Create production env:**
   ```bash
   cp .env.prod.example .env.prod
   # Fill in: POSTGRES_PASSWORD, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID,
   # GOOGLE_CLIENT_SECRET, DOMAIN, LETSENCRYPT_EMAIL, NEXTAUTH_URL
   nano .env.prod
   ```
   - `POSTGRES_PASSWORD`: `openssl rand -base64 24`
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - `NEXTAUTH_URL`: `https://<your-domain>`
   - `DOMAIN`: `<your-domain>`
5. **DNS A record** for your domain → VPS public IP. Wait for it to propagate
   (`dig +short <your-domain>` from the VPS should show the VPS IP).
6. **Build + start the stack:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
7. **First-time TLS:**
   ```bash
   bash scripts/bootstrap-tls.sh
   ```
   This requests a Let's Encrypt cert for your domain and reloads nginx.
   Verify: `curl -I https://<your-domain>` returns a 200/301.

## Data migration (from Supabase)

Done **once**, on a deploy night. Both the live Vercel app AND the new VPS
stack can coexist while you're testing.

On your **laptop**:

```bash
# 1. Dump the database (already created in backups/db-YYYY-MM-DD.sql by us)
ls backups/

# 2. Ship the dump + the storage backup to the VPS
scp backups/db-*.sql      user@vps:/opt/meydan/
scp -r backups/storage    user@vps:/opt/meydan/backups/
```

On the **VPS**:

```bash
cd /opt/meydan

# Restore Postgres + rewrite Supabase Storage URLs in the DB
bash scripts/import-supabase-dump.sh db-YYYY-MM-DD.sql

# Copy avatars + field photos into the uploads volume
bash scripts/import-storage.sh backups/storage
```

Verify: `docker compose -f docker-compose.prod.yml exec db psql -U meydan -d meydan -c 'SELECT count(*) FROM users;'`

## Cutover checklist

When you're confident the VPS works, point users at it:

- [ ] In Google Cloud Console → Meydan Web client → Authorized redirect URIs:
      add `https://<your-domain>/api/auth/callback/google`
- [ ] Authorized JavaScript origins: add `https://<your-domain>`
- [ ] Update `capacitor.config.ts` → `server.url` → `https://<your-domain>`
- [ ] Bump Android versionCode, rebuild APK with `cd android && ./gradlew bundleRelease assembleRelease`
- [ ] Update `public/.well-known/assetlinks.json` if you change the signing key
- [ ] Redirect old Vercel domain to the new one (or just take Vercel down)

## Day-2 operations

| What | How |
|---|---|
| **Deploy new code** | `cd /opt/meydan && git pull && docker compose -f docker-compose.prod.yml up -d --build app` |
| **View logs** | `docker compose -f docker-compose.prod.yml logs -f app` |
| **DB shell** | `docker compose -f docker-compose.prod.yml exec db psql -U meydan -d meydan` |
| **DB backup** | `docker compose -f docker-compose.prod.yml exec db pg_dump -U meydan meydan > backup-$(date +%F).sql` |
| **Renew TLS** | Automatic (certbot service runs `renew` every 12h) |
| **Storage usage** | `docker compose -f docker-compose.prod.yml exec app du -sh /app/uploads` |

## Backups

The `db-data`, `uploads`, and `certbot-etc` volumes are critical. Lose
`db-data` = lose every user. Lose `uploads` = avatars and field photos 404
but the app still works.

### Local nightly snapshots (set up once)

`scripts/backup.sh` dumps Postgres + tars the uploads volume, writes them
gzipped to `/var/backups/meydan/`, and prunes anything older than 14 days
(override with `RETENTION_DAYS`).

```bash
# Wire it into root's crontab — 03:30 UTC nightly
sudo crontab -e
# Add:
30 3 * * * /opt/meydan/scripts/backup.sh >> /var/log/meydan-backup.log 2>&1

# Smoke-test it now (don't wait for the cron to find out it's broken):
sudo /opt/meydan/scripts/backup.sh
ls -lh /var/backups/meydan/db/
```

### Get backups OFF the server (this is what makes them backups)

A local copy on the same disk that holds the live data is not a backup. Pick
one and run it on the SAME cron, AFTER `backup.sh`:

```bash
# Option A — rsync to a second box you own
rsync -az --delete /var/backups/meydan/ user@backup-host:/backups/meydan/

# Option B — restic to Backblaze B2 (encrypted, deduplicated, ~$0.005/GB/mo)
restic -r b2:meydan-backups:/ backup /var/backups/meydan/

# Option C — rclone to any S3-compatible bucket (R2 / B2 / Wasabi)
rclone copy /var/backups/meydan/ remote:meydan-backups/
```

### Restoring from a backup

```bash
cd /opt/meydan

# Postgres
gunzip -c /var/backups/meydan/db/meydan-YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db \
    psql -U meydan -d meydan

# Uploads (overwrites the volume)
docker run --rm \
  -v meydan_uploads:/data \
  -v /var/backups/meydan/uploads:/in:ro \
  alpine sh -c 'cd /data && tar xzf /in/meydan-uploads-YYYYMMDDTHHMMSSZ.tar.gz'
```

Periodically restore a backup into a throwaway compose stack on your laptop to
prove the dumps actually load — silent corruption is the failure mode that
kills startups.
