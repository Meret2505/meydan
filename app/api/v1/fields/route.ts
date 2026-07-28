import { requireOnboarded } from "@/lib/api/auth";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toFieldCardDto } from "@/lib/api/serializers/field";
import { fetchFields } from "@/lib/services/field-queries";

/**
 * The full fields catalogue for the mobile fields tab. Returned in one shot
 * (there are a few dozen fields, not thousands) so search, the favorites-first
 * sort, and filtering all happen client-side with no per-keystroke round-trip.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  const origin = originOf(request);

  const { fields, favoriteIds } = await fetchFields(userId);

  return ok({
    fields: fields.map((field) => toFieldCardDto(field, origin, favoriteIds)),
  });
});
