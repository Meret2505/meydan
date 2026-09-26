import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { matchResultApiError } from "@/lib/api/match-result-errors";
import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { handler, ok } from "@/lib/api/response";
import { originOf } from "@/lib/api/images";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { parseJson } from "@/lib/api/validate";
import { getGameDetail } from "@/lib/services/game-queries";
import { reportMatchScore } from "@/lib/services/match-result";

type Context = { params: Promise<{ id: string }> };

const schema = z
  .object({
    scoreHome: z.number().int().min(0).max(99),
    scoreAway: z.number().int().min(0).max(99),
    /** Only this captain's own side is accepted; the rest is ignored. */
    attended: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

/** A captain enters the score and ticks who from their side turned up. */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("match-score", userId, 30, PER_HOUR);
  const { id } = await context.params;
  const input = await parseJson(request, schema);

  const result = await reportMatchScore(id, userId, input);
  if (!result.ok) throw matchResultApiError(result.error);

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");
  return ok(toGameDetailDto(detail, originOf(request)));
});
