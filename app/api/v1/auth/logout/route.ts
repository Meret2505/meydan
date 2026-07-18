import { z } from "zod";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { revokeRefreshToken } from "@/lib/services/refresh-tokens";

const schema = z.object({ refreshToken: z.string().min(1) });

/**
 * Revokes a refresh token.
 *
 * Deliberately does not require a valid access token. A user logging out often
 * has an expired one, and refusing them would leave a live refresh token on a
 * device they are trying to sign out of. Possession of the refresh token is
 * sufficient proof, and the only thing it authorises here is its own
 * destruction.
 *
 * Always reports success, including for an unknown or already-revoked token:
 * the caller gets the state it asked for either way, and probing which tokens
 * exist should not be possible.
 */
export const POST = handler(async (request: Request) => {
  const { refreshToken } = await parseJson(request, schema);
  await revokeRefreshToken(refreshToken);
  return ok({ revoked: true });
});
