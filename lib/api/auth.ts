import { forbidden, unauthorized } from "./errors";
import { verifyAccessToken, type AccessTokenClaims } from "./tokens";

/**
 * Extracts and verifies the bearer access token.
 *
 * Deliberately does NOT use the Origin-vs-Host CSRF check that
 * app/api/fcm/token/route.ts performs. That check exists because a cookie is
 * sent automatically by the browser; a bearer token is not, so there is no
 * CSRF surface to defend — and a native client sends no Origin header at all,
 * so copying that check would reject every legitimate mobile request.
 */
export async function requireAuth(request: Request): Promise<AccessTokenClaims> {
  const header = request.headers.get("authorization");
  // RFC 7235: the auth scheme is case-insensitive.
  if (!header || !/^bearer\s/i.test(header)) throw unauthorized();

  const token = header.replace(/^bearer\s+/i, "").trim();
  if (!token) throw unauthorized();

  const claims = await verifyAccessToken(token);
  if (!claims) throw unauthorized();
  return claims;
}

/**
 * As requireAuth, but also demands a completed profile.
 *
 * Mirrors the web guard in app/[locale]/(main)/layout.tsx, which bounces users
 * without a phone to /onboarding/name. Endpoints that onboarding itself calls
 * (PATCH /me) must use requireAuth instead, or a user could never finish
 * onboarding.
 */
export async function requireOnboarded(request: Request): Promise<AccessTokenClaims> {
  const claims = await requireAuth(request);
  if (!claims.onboardingComplete) throw forbidden("onboarding_required");
  return claims;
}
