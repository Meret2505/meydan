import { z } from "zod";
import { badRequest, rateLimited, unauthorized } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { clientIpFrom } from "@/lib/api/request";
import { parseJson } from "@/lib/api/validate";
import { phoneLoginOrSignup } from "@/lib/services/auth";
import { createMobileSession } from "@/lib/services/session";

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
  locale: z.enum(["ru", "tm"]).default("ru"),
});

/**
 * Phone login **or signup** — an unknown number creates an account, matching
 * the web behaviour in app/actions/auth.ts.
 *
 * `isNewSignup` tells the client whether to route into onboarding or straight
 * to the feed. It is not inferable from the profile: a phone signup sets
 * `phone` immediately, so `onboardingComplete` is already true even though the
 * user has not yet chosen a name, position, district or age.
 */
export const POST = handler(async (request: Request) => {
  const body = await parseJson(request, schema);

  const result = await phoneLoginOrSignup({
    phone: body.phone,
    password: body.password,
    locale: body.locale,
    ip: clientIpFrom(request),
  });

  if (!result.ok) {
    if (result.error === "rate_limited") throw rateLimited();
    if (result.error === "invalid_input") throw badRequest();
    // "wrong_password" also covers "no such account" and the unique-phone
    // race, on purpose — the client must not learn which number is registered.
    throw unauthorized("wrong_password");
  }

  const session = await createMobileSession(result.userId, originOf(request));
  return ok({ ...session, isNewSignup: result.isNewSignup });
});
