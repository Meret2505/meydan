import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { getGameDetail } from "@/lib/services/game-queries";
import { cancelGame } from "@/lib/services/games";

type Context = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});

/**
 * Cancels a game — the organizer-only action from the web game page. The game
 * is soft-deleted (status CANCELLED) so players keep seeing it with the reason,
 * which is why this returns the updated detail rather than an empty 204.
 */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const result = await cancelGame(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("game_not_found");
    if (result.error === "not_organizer") throw forbidden("not_organizer");
    throw conflict("game_over");
  }

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});
