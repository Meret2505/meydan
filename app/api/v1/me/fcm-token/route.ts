import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { prisma } from "@/lib/prisma";

// Matches the length cap on the existing web endpoint.
const schema = z.object({ token: z.string().min(1).max(4096) });

/**
 * Registers this device's FCM token.
 *
 * Unlike app/api/fcm/token/route.ts, this performs no Origin-vs-Host check.
 * That guard exists there because a cookie session is attached automatically
 * by the browser, making the endpoint CSRF-able; a bearer token is not, and a
 * native client sends no Origin header at all.
 *
 * Note: User.fcmToken is a single column, so registering on a second device
 * silently displaces the first. Fine while each user has one phone; revisit
 * with a device table if that stops being true.
 */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireAuth(request);
  await enforceRateLimit("fcm-token", userId, 60, PER_HOUR);
  const { token } = await parseJson(request, schema);

  await prisma.user.update({ where: { id: userId }, data: { fcmToken: token } });

  return ok({ registered: true });
});
