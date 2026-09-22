import { rateLimited } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Per-user budget for a mutating endpoint.
 *
 * The limiter itself was already correct and serverless-safe, but only the auth
 * routes and uploads consulted it — so creating games, teams, tournaments and
 * submission photos was unbounded, and join/leave could be flapped to spam an
 * organizer with notifications and pushes.
 *
 * Budgets are deliberately generous: they exist to stop a script, not to
 * ration normal use, and the limiter fails open if the database is unhappy.
 */
export async function enforceRateLimit(
  bucket: string,
  subject: string,
  max: number,
  windowMs: number,
): Promise<void> {
  const { allowed } = await rateLimit(`${bucket}:${subject}`, max, windowMs);
  if (!allowed) throw rateLimited();
}

export const PER_HOUR = 60 * 60_000;
export const PER_DAY = 24 * 60 * 60_000;
