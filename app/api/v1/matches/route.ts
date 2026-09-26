import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { matchApiError } from "@/lib/api/match-errors";
import { enforceRateLimit, PER_DAY } from "@/lib/api/rate-limit";
import { handler, ok } from "@/lib/api/response";
import { originOf } from "@/lib/api/images";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { parseJson } from "@/lib/api/validate";
import { getGameDetail } from "@/lib/services/game-queries";
import { createMatch } from "@/lib/services/matches";

const createSchema = z
  .object({
    homeTeamId: z.string(),
    /** Omit for an open "looking for an opponent" call. */
    opponentTeamId: z.string().nullish(),
    scheduledAt: z.string(),
    fieldId: z.string().nullish(),
    fieldName: z.string().nullish(),
    format: z.number().int().nullish(),
    notes: z.string().nullish(),
  })
  .strict();

/**
 * Arranges a match: a challenge to a named team, or an open call the first
 * captain to answer takes. Returns the full detail so the client can go
 * straight to it, like POST /games.
 */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("create-match", userId, 20, PER_DAY);
  const input = await parseJson(request, createSchema);

  const detail = await withIdempotency(request, userId, "create-match", async () => {
    const result = await createMatch(userId, {
      homeTeamId: input.homeTeamId,
      opponentTeamId: input.opponentTeamId ?? null,
      scheduledAt: input.scheduledAt,
      fieldId: input.fieldId ?? null,
      fieldName: input.fieldName ?? null,
      format: input.format ?? null,
      notes: input.notes ?? null,
    });
    if (!result.ok) throw matchApiError(result.error);

    const created = await getGameDetail(result.gameId, userId);
    if (!created) throw notFound("game_not_found");
    return toGameDetailDto(created, originOf(request));
  });

  return ok(detail);
});
