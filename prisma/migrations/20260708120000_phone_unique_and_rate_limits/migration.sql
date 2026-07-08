-- Rate-limit counter table (Postgres-backed limiter in lib/rate-limit.ts).
-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- Enforce one account per phone number (security fix H1). NULL phones are
-- exempt (Postgres allows multiple NULLs in a UNIQUE index), so accounts that
-- have not set a phone are unaffected.
--
-- NOTE FOR OPERATORS: phone was previously unverified and non-unique, so a
-- legacy database MAY contain duplicate non-null phones. If this statement
-- fails with a unique-violation, dedupe first, e.g.:
--   SELECT phone, count(*) FROM users
--   WHERE phone IS NOT NULL GROUP BY phone HAVING count(*) > 1;
-- then null-out or merge the offending rows before re-running the migration.
-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
