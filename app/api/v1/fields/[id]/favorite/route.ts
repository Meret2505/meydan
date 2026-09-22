import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { setFieldFavorite } from "@/lib/services/field-queries";

type Context = { params: Promise<{ id: string }> };

/** Favorite a field. Idempotent. */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("favorite", userId, 120, PER_HOUR);
  const { id } = await context.params;

  const result = await setFieldFavorite(userId, id, true);
  if (!result.ok) throw notFound("field_not_found");

  return ok({ favorite: true });
});

/** Unfavorite a field. Idempotent. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("favorite", userId, 120, PER_HOUR);
  const { id } = await context.params;

  const result = await setFieldFavorite(userId, id, false);
  if (!result.ok) throw notFound("field_not_found");

  return ok({ favorite: false });
});
