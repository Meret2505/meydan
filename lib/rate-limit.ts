import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window (0 once blocked). */
  remaining: number;
}

/**
 * Fixed-window rate limit backed by a single atomic Postgres statement, so it
 * counts correctly even when many serverless instances hit it concurrently.
 *
 * The INSERT ... ON CONFLICT either starts a fresh window (row absent or
 * expired) or increments the existing counter, and RETURNs the post-increment
 * count in one round-trip — no read-then-write race.
 *
 * Fails OPEN: if the DB call throws we allow the request rather than lock
 * everyone out of login on a transient DB blip.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const expiresAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO rate_limits (key, count, "expiresAt")
      VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT (key) DO UPDATE
      SET count = CASE
            WHEN rate_limits."expiresAt" < now() THEN 1
            ELSE rate_limits.count + 1
          END,
          "expiresAt" = CASE
            WHEN rate_limits."expiresAt" < now() THEN ${expiresAt}
            ELSE rate_limits."expiresAt"
          END
      RETURNING count
    `;
    const count = Number(rows[0]?.count ?? 1);
    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  } catch (e) {
    console.warn("[rate-limit] check failed, allowing:", (e as Error).message);
    return { allowed: true, remaining: max };
  }
}

/**
 * Best-effort client IP for keying anonymous limits. Behind nginx/Vercel the
 * real client is the first hop in X-Forwarded-For. Falls back to a constant so
 * a missing header degrades to a shared (stricter) bucket rather than no limit.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}
