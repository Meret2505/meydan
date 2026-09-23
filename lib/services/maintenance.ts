import { prisma } from "@/lib/prisma";

/**
 * Housekeeping for the tables that only ever grew.
 *
 * `rate_limits` reuses a row per (bucket, subject) window but never deleted
 * one, and the keys include `login:ip:<addr>` — unbounded cardinality, one row
 * per address that ever tried to sign in. `refresh_tokens` rotates on every
 * refresh and marks the old row revoked, also without ever deleting.
 * `idempotency_keys` gains a row per create and is never read again after the
 * submit it guards.
 *
 * None is urgent at this size, which is exactly why it wants doing before it
 * is: the first two are on the login path.
 */

/** A rate-limit window is at most a day, so a day past expiry is dead weight. */
const RATE_LIMIT_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * How long an expired refresh token is kept.
 *
 * Not zero on purpose: presenting a *revoked* token is how token theft is
 * detected (it revokes the whole family — see refresh-tokens.ts), and deleting
 * the row turns that signal into a plain "not found". A token this far past its
 * own expiry would be rejected on expiry grounds anyway, so nothing is lost.
 */
const REFRESH_TOKEN_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How long an idempotency key stays answerable.
 *
 * It only has to outlive the retries of one submit — a client that comes back
 * a day later is making a new request, and should get a new game. Long enough
 * to cover a phone that was put in a pocket mid-submit; short enough that the
 * table stays small, since every create writes one row.
 */
const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

export type PurgeResult = {
  rateLimits: number;
  refreshTokens: number;
  idempotencyKeys: number;
};

export async function purgeExpiredRows(now: Date = new Date()): Promise<PurgeResult> {
  const [rateLimits, refreshTokens, idempotencyKeys] = await Promise.all([
    prisma.rateLimit.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - RATE_LIMIT_GRACE_MS) } },
    }),
    prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - REFRESH_TOKEN_GRACE_MS) } },
    }),
    prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - IDEMPOTENCY_KEY_TTL_MS) } },
    }),
  ]);

  return {
    rateLimits: rateLimits.count,
    refreshTokens: refreshTokens.count,
    idempotencyKeys: idempotencyKeys.count,
  };
}
