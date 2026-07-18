import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toUserDto } from "@/lib/api/serializers/user";
import { signAccessToken } from "@/lib/api/tokens";
import { parseJson } from "@/lib/api/validate";
import { prisma } from "@/lib/prisma";
import { updateOnboardingProfile } from "@/lib/services/onboarding";

const patchSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    position: z.string().optional(),
    district: z.string().optional(),
    age: z.union([z.string(), z.number(), z.null()]).optional(),
    locale: z.string().optional(),
  })
  .strict();

/**
 * These use requireAuth, not requireOnboarded: onboarding itself calls PATCH,
 * so demanding a completed profile would make it impossible to complete one.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireAuth(request);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("user_not_found");

  // Same envelope as PATCH, minus the token, so the client has one shape to parse.
  return ok({ user: toUserDto(user, originOf(request)) });
});

/**
 * Applies a partial profile update. Backs every onboarding step as well as
 * profile editing and the in-app language toggle — the client sends whichever
 * fields changed.
 */
export const PATCH = handler(async (request: Request) => {
  const claims = await requireAuth(request);
  const patch = await parseJson(request, patchSchema);

  const result = await updateOnboardingProfile(claims.userId, patch);
  if (!result.ok) {
    if (result.error === "phone_taken") throw conflict("phone_taken");
    throw badRequest();
  }

  const user = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!user) throw notFound("user_not_found");

  const dto = toUserDto(user, originOf(request));

  // Setting a phone completes onboarding, but the caller's access token still
  // asserts the old value and is good for another 15 minutes — so the client
  // would finish onboarding and immediately be bounced back to it by
  // requireOnboarded. Hand back a re-minted token whenever the flag changes so
  // the client can swap it in without a refresh round-trip.
  const accessToken =
    dto.onboardingComplete !== claims.onboardingComplete
      ? await signAccessToken({
          userId: claims.userId,
          onboardingComplete: dto.onboardingComplete,
        })
      : undefined;

  return ok({ user: dto, accessToken });
});
