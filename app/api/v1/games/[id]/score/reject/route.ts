import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { matchResultApiError } from "@/lib/api/match-result-errors";
import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { handler, ok } from "@/lib/api/response";
import { originOf } from "@/lib/api/images";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { getGameDetail } from "@/lib/services/game-queries";
import { rejectMatchScore } from "@/lib/services/match-result";

type Context = { params: Promise<{ id: string }> };

export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("match-score", userId, 30, PER_HOUR);
  const { id } = await context.params;

  const result = await rejectMatchScore(id, userId);
  if (!result.ok) throw matchResultApiError(result.error);

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");
  return ok(toGameDetailDto(detail, originOf(request)));
});
