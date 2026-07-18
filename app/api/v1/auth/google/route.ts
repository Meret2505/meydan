import { z } from "zod";
import { ApiError, rateLimited, unauthorized } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { clientIpFrom } from "@/lib/api/request";
import { parseJson } from "@/lib/api/validate";
import { rateLimit } from "@/lib/rate-limit";
import { verifyGoogleIdToken } from "@/lib/services/google-auth";
import { createMobileSession } from "@/lib/services/session";

const schema = z.object({ idToken: z.string().min(1) });

/**
 * Exchanges a Google ID token from Credential Manager for a mobile session.
 *
 * Verification is shared with the web "google-id-token" provider
 * (lib/services/google-auth.ts), so both surfaces trust exactly the same
 * checks.
 */
export const POST = handler(async (request: Request) => {
  const { idToken } = await parseJson(request, schema);

  // Each attempt costs a Google signature verification, so throttle by IP.
  // The web flow has no equivalent limit because it is redirect-based and not
  // scriptable in the same way.
  const limit = await rateLimit(`auth:google:${clientIpFrom(request)}`, 20, 10 * 60_000);
  if (!limit.allowed) throw rateLimited();

  const result = await verifyGoogleIdToken(idToken);
  if (!result.ok) {
    // A missing GOOGLE_CLIENT_ID is our misconfiguration, not the caller's.
    if (result.error === "not_configured") {
      throw new ApiError("not_configured", 500);
    }
    throw unauthorized("invalid_token");
  }

  return ok(await createMobileSession(result.userId, originOf(request)));
});
