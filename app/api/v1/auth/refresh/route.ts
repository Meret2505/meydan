import { z } from "zod";
import { unauthorized } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { rotateRefreshToken } from "@/lib/services/refresh-tokens";
import { buildSession } from "@/lib/services/session";

const schema = z.object({ refreshToken: z.string().min(1) });

/**
 * Exchanges a refresh token for a new token pair.
 *
 * Takes no access token: the whole point is to be callable once the access
 * token has expired. The refresh token is the credential.
 *
 * The presented token is invalidated on success, so a client must store the
 * returned one. Replaying a rotated token is treated as theft and kills the
 * entire family (see lib/services/refresh-tokens.ts).
 */
export const POST = handler(async (request: Request) => {
  const { refreshToken } = await parseJson(request, schema);

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated.ok) throw unauthorized("invalid_refresh_token");

  const session = await buildSession(
    rotated.userId,
    originOf(request),
    rotated.refreshToken,
  );
  return ok(session);
});
