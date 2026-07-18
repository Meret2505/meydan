import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Phone authentication, extracted from app/actions/auth.ts so the web Server
 * Action and the mobile API route share one implementation.
 *
 * Framework-agnostic by design: the caller supplies the client IP rather than
 * this module reaching for next/headers, which is what lets it run from a
 * Route Handler, a Server Action, or a test.
 *
 * Every protection in the original is preserved deliberately — see the
 * comments below. This is not a rewrite; it is a move.
 */

const BCRYPT_COST = 12;

// A precomputed hash of a throwaway value. Comparing against it on the
// account-not-found path keeps login timing uniform, so an attacker can't
// distinguish "no such phone" from "wrong password" by response latency.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO3f3xw8Q1u6Iq7Xj2h5Yb3kq0Wl3nHy";

/** Minimum password length for NEW accounts only. See note in the code. */
export const MIN_NEW_PASSWORD_LENGTH = 8;

export type PhoneAuthError = "invalid_input" | "rate_limited" | "wrong_password";

export type PhoneAuthResult =
  | { ok: true; userId: string; phone: string; isNewSignup: boolean }
  | { ok: false; error: PhoneAuthError };

/**
 * Logs a user in, or creates the account if the phone is unknown.
 *
 * This is login-OR-signup, not login. That is the existing product behaviour
 * and callers depend on `isNewSignup` to decide whether to route to onboarding
 * or straight to the feed.
 */
export async function phoneLoginOrSignup(params: {
  phone: string;
  password: string;
  locale: string;
  ip: string;
}): Promise<PhoneAuthResult> {
  const phone = normalizePhone(params.phone.trim());
  const { password } = params;

  // Login must still accept legacy passwords (older accounts used a 6-char
  // minimum), so only require non-empty here; the stronger length floor is
  // enforced on new signups below.
  if (!phone || password.length < 1) return { ok: false, error: "invalid_input" };

  // Throttle brute force / mass signup: 10 attempts per IP per 10 min, and 5
  // per phone per 15 min (tighter, since a targeted attack fixes the phone).
  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimit(`login:ip:${params.ip}`, 10, 10 * 60_000),
    rateLimit(`login:phone:${phone}`, 5, 15 * 60_000),
  ]);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (!existing) {
    if (password.length < MIN_NEW_PASSWORD_LENGTH) {
      return { ok: false, error: "invalid_input" };
    }
    const hashed = await bcrypt.hash(password, BCRYPT_COST);
    try {
      const created = await prisma.user.create({
        data: { name: phone, phone, password: hashed, locale: params.locale },
      });
      return { ok: true, userId: created.id, phone, isNewSignup: true };
    } catch (e) {
      // Unique-constraint race: another request created this phone between the
      // findUnique above and here. Treat as a normal (failed) login attempt —
      // reporting "already exists" would confirm the number to an attacker.
      if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
        return { ok: false, error: "wrong_password" };
      }
      throw e;
    }
  }

  // Always run a bcrypt compare (real or dummy) so timing doesn't reveal
  // whether the account exists / has a password set.
  const valid = await bcrypt.compare(password, existing.password ?? DUMMY_HASH);
  if (!existing.password || !valid) return { ok: false, error: "wrong_password" };

  return { ok: true, userId: existing.id, phone, isNewSignup: false };
}
