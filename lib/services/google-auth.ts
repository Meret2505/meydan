import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";

/**
 * Verifies a Google ID token and resolves it to a local user.
 *
 * Extracted from the "google-id-token" Credentials provider in lib/auth.ts so
 * the web provider and the mobile API route verify tokens identically. Both
 * the Capacitor shell and the native Android client obtain an ID token from a
 * Google SDK configured with serverClientId = GOOGLE_CLIENT_ID, so the token's
 * audience is our web client id either way — no separate audience to manage.
 */

// Reusable verifier; it fetches and caches Google's signing keys internally.
const googleVerifier = new OAuth2Client();

export type GoogleAuthResult =
  | {
      ok: true;
      userId: string;
      name: string;
      email: string | null;
      /** Mirrors lib/auth.ts: a profile counts as complete once it has a phone. */
      onboardingComplete: boolean;
    }
  | { ok: false; error: "invalid_token" | "not_configured" };

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleAuthResult> {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) return { ok: false, error: "not_configured" };
  if (!idToken) return { ok: false, error: "invalid_token" };

  let payload;
  try {
    const ticket = await googleVerifier.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch {
    // Signature, expiry, issuer, or audience mismatch — all indistinguishable
    // to the caller on purpose.
    return { ok: false, error: "invalid_token" };
  }

  // An unverified email must never be trusted to match an existing account:
  // it would let anyone claim a user by registering their address at an IdP
  // that does not verify.
  if (!payload?.email_verified || !payload.sub) {
    return { ok: false, error: "invalid_token" };
  }

  const email = payload.email ?? undefined;
  const name = payload.name ?? email ?? "Google user";
  const avatar = payload.picture ?? undefined;

  // Find by email or create. (Account-table linking happens through the
  // standard Google OAuth provider on web — here we just need the User row so
  // the phone-based join paths work.)
  let user = email ? await prisma.user.findFirst({ where: { email } }) : null;
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, avatar, locale: "ru" },
    });
  }

  return {
    ok: true,
    userId: user.id,
    name: user.name,
    email: user.email,
    onboardingComplete: !!user.phone,
  };
}
