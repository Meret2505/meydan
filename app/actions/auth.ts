"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

const BCRYPT_COST = 12;
// A precomputed hash of a throwaway value. Comparing against it on the
// account-not-found path keeps login timing uniform, so an attacker can't
// distinguish "no such phone" from "wrong password" by response latency.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO3f3xw8Q1u6Iq7Xj2h5Yb3kq0Wl3nHy";

export async function phoneLoginOrSignup(formData: FormData) {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  const phone = normalizePhone(rawPhone);
  // Login must still accept legacy passwords (older accounts used a 6-char
  // minimum), so only require non-empty here; the stronger length floor is
  // enforced on new signups below.
  if (!phone || password.length < 1) {
    return { error: "invalid_input" as const };
  }

  // Throttle brute force / mass signup: 10 attempts per IP per 10 min, and 5
  // per phone per 15 min (tighter, since a targeted attack fixes the phone).
  const ip = clientIp();
  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 10, 10 * 60_000),
    rateLimit(`login:phone:${phone}`, 5, 15 * 60_000),
  ]);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    return { error: "rate_limited" as const };
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  const isNewSignup = !existing;

  if (!existing) {
    if (password.length < 8) return { error: "invalid_input" as const };
    const hashed = await bcrypt.hash(password, BCRYPT_COST);
    try {
      await prisma.user.create({
        data: {
          name: phone,
          phone,
          password: hashed,
          locale,
        },
      });
    } catch (e) {
      // Unique-constraint race: another request created this phone between the
      // findUnique above and here. Treat as a normal (failed) login attempt.
      if (
        e &&
        typeof e === "object" &&
        (e as { code?: string }).code === "P2002"
      ) {
        return { error: "wrong_password" as const };
      }
      throw e;
    }
  } else {
    // Always run a bcrypt compare (real or dummy) so timing doesn't reveal
    // whether the account exists / has a password set.
    const ok = await bcrypt.compare(password, existing.password ?? DUMMY_HASH);
    if (!existing.password || !ok) return { error: "wrong_password" as const };
  }

  try {
    await signIn("credentials", {
      phone,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "auth_failed" as const };
    throw e;
  }

  // New signups pick a display name / district / position; returning users skip
  // straight to the feed.
  redirect(isNewSignup ? `/${locale}/onboarding/name` : `/${locale}`);
}

export async function googleSignIn(locale: string) {
  // Land on the feed; the (main) layout guard sends users with incomplete
  // onboarding to /onboarding/name and lets returning users straight in.
  await signIn("google", { redirectTo: `/${locale}` });
}

/**
 * Server action called from the Capacitor Android shell after the native
 * Google Sign-In SDK returns an ID token. Verifies the token via our
 * "google-id-token" Credentials provider (lib/auth.ts), sets the session
 * cookie, and redirects into the app.
 */
export async function googleIdTokenSignIn(idToken: string, locale: string) {
  if (!idToken) return { error: "missing_token" as const };
  try {
    await signIn("google-id-token", {
      idToken,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "auth_failed" as const };
    throw e;
  }
  redirect(`/${locale}`);
}
