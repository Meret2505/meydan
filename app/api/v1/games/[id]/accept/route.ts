import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { matchApiError } from "@/lib/api/match-errors";
import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { handler, ok } from "@/lib/api/response";
import { originOf } from "@/lib/api/images";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { parseJson } from "@/lib/api/validate";
import { getGameDetail } from "@/lib/services/game-queries";
import { acceptMatch } from "@/lib/services/matches";

type Context = { params: Promise<{ id: string }> };

/**
 * Takes a challenge, or claims an open call.
 *
 * `teamId` is required rather than inferred: a captain may run more than one
 * team, and which of them is playing is not the server's guess to make.
 */
const acceptSchema = z.object({ teamId: z.string() }).strict();

export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("respond-match", userId, 60, PER_HOUR);
  const { id } = await context.params;
  const { teamId } = await parseJson(request, acceptSchema);

  const result = await acceptMatch(id, userId, teamId);
  if (!result.ok) throw matchApiError(result.error);

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");
  return ok(toGameDetailDto(detail, originOf(request)));
});
