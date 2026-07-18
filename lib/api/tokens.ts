import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Token minting and verification for native clients.
 *
 * The web app authenticates with a NextAuth cookie session, which a native
 * client cannot carry sensibly (no browser cookie jar, no CSRF story, no
 * redirect flow). Mobile therefore gets a short-lived bearer access token plus
 * a long-lived rotating refresh token.
 *
 * Nothing here touches NextAuth's own JWTs — the two schemes coexist without
 * interfering, which is what lets the web app stay exactly as it is.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_DAYS = 60;

const ISSUER = "meydan";
const AUDIENCE = "meydan-mobile";

export type AccessTokenClaims = {
  userId: string;
  onboardingComplete: boolean;
};

/**
 * Reuses the secret NextAuth already requires, so deployments need no new
 * environment variable. Read lazily rather than at module load: importing this
 * file must not crash a process that never mints a token (e.g. `next build`).
 */
function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is not configured");
  }
  return new TextEncoder().encode(value);
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ onboardingComplete: claims.onboardingComplete })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

/**
 * Verifies signature, expiry, issuer and audience. Returns null on any
 * failure — callers turn that into a 401 without distinguishing *why*, since
 * telling a caller whether a token was expired, forged, or issued for another
 * audience only helps an attacker.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      onboardingComplete: payload.onboardingComplete === true,
    };
  } catch {
    return null;
  }
}

/**
 * Opaque 256-bit refresh token. Deliberately not a JWT: a refresh token must be
 * revocable, and revoking a stateless JWT means keeping a denylist anyway. An
 * opaque value looked up in refresh_tokens is simpler and revokes instantly.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Only the hash is ever persisted, so a database leak yields nothing
 * presentable. SHA-256 without a salt is correct here — unlike a password,
 * the input is 256 bits of entropy, so there is no dictionary to attack and a
 * slow KDF would only add latency to every refresh.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
