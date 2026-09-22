import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { getGameDetail } from "@/lib/services/game-queries";
import { joinGame, leaveGame } from "@/lib/services/games";

type Context = { params: Promise<{ id: string }> };

/**
 * Both handlers return the updated game detail rather than a bare acknowledgement.
 * Join and leave change the roster, the open-slot count, and often the status,
 * so returning the new state saves the client an immediate follow-up GET and
 * removes any window where the UI shows stale counts.
 */
async function respondWithGame(request: Request, gameId: string, userId: string) {
  const detail = await getGameDetail(gameId, userId);
  if (!detail) throw notFound("game_not_found");
  return ok(toGameDetailDto(detail, originOf(request)));
}

/** Join a game. Idempotent — joining twice succeeds. */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("join-game", userId, 60, PER_HOUR);
  const { id } = await context.params;

  const result = await joinGame(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("game_not_found");
    if (result.error === "game_full") throw conflict("game_full");
    throw conflict("game_not_joinable");
  }

  return respondWithGame(request, id, userId);
});

/** Leave a game. The organizer cannot leave their own. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("join-game", userId, 60, PER_HOUR);
  const { id } = await context.params;

  const result = await leaveGame(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("game_not_found");
    if (result.error === "organizer_cannot_leave") {
      throw forbidden("organizer_cannot_leave");
    }
    throw conflict("game_over");
  }

  return respondWithGame(request, id, userId);
});
