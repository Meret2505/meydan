import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { getGameDetail } from "@/lib/services/game-queries";
import { cancelGame } from "@/lib/services/games";
import { cancelMatch } from "@/lib/services/matches";
import { matchApiError } from "@/lib/api/match-errors";
import { prisma } from "@/lib/prisma";
import { supportsTeamMatches } from "@/lib/api/client-features";

type Context = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");
  // Reachable by deep link from a notification that landed in an older
  // build's inbox regardless of its version, which is the tap that would
  // otherwise render a match as an ordinary game with a Join button.
  if (detail.game.type === "TEAM_MATCH" && !supportsTeamMatches(request)) {
    throw notFound("game_not_found");
  }

  return ok(toGameDetailDto(detail, originOf(request)));
});

/**
 * Cancels a game — the organizer-only action from the web game page. The game
 * is soft-deleted (status CANCELLED) so players keep seeing it with the reason,
 * which is why this returns the updated detail rather than an empty 204.
 */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("cancel-game", userId, 20, PER_HOUR);
  const { id } = await context.params;

  // A team match is called off by its home captain, who may no longer be the
  // row's organizer — and the opponent has to be told. Same URL, because from
  // the outside both are "call this off".
  const existing = await prisma.game.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!existing) throw notFound("game_not_found");

  if (existing.type === "TEAM_MATCH") {
    const cancelled = await cancelMatch(id, userId);
    if (!cancelled.ok) throw matchApiError(cancelled.error);
  } else {
    const result = await cancelGame(id, userId);
    if (!result.ok) {
      if (result.error === "not_found") throw notFound("game_not_found");
      if (result.error === "not_organizer") throw forbidden("not_organizer");
      throw conflict("game_over");
    }
  }

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});
