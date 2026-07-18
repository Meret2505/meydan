import { prisma } from "@/lib/prisma";
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from "@/lib/api/tokens";
import { toUserDto, type UserDto } from "@/lib/api/serializers/user";
import { issueRefreshToken } from "./refresh-tokens";

/**
 * A freshly minted mobile session: the token pair plus the profile the client
 * needs to render its first screen without a second round-trip.
 */
export type MobileSession = {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires; the client refreshes ahead of it. */
  expiresIn: number;
  user: UserDto;
};

/**
 * Assembles a session around a refresh token that already exists.
 *
 * Used by the refresh endpoint, where rotation has already produced the new
 * refresh token and issuing another would orphan it.
 */
export async function buildSession(
  userId: string,
  origin: string,
  refreshToken: string,
): Promise<MobileSession> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`buildSession: user ${userId} not found`);

  // Re-read from the database rather than trusting the old token's claim: a
  // user who just finished onboarding must get an access token that says so,
  // otherwise requireOnboarded would keep bouncing them for 15 minutes.
  const onboardingComplete = !!user.phone;

  return {
    accessToken: await signAccessToken({ userId, onboardingComplete }),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toUserDto(user, origin),
  };
}

/**
 * Creates a mobile session for an already-authenticated user.
 *
 * Called after credentials verify (phone or Google). Starts a new refresh-token
 * family, so signing in on a second device does not disturb the first.
 */
export async function createMobileSession(
  userId: string,
  origin: string,
): Promise<MobileSession> {
  const { refreshToken } = await issueRefreshToken(userId);
  return buildSession(userId, origin, refreshToken);
}
