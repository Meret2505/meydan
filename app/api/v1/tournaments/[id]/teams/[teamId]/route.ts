import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";
import { unregisterTeam } from "@/lib/services/tournaments";

type Context = { params: Promise<{ id: string; teamId: string }> };

/** Withdraws one of the caller's teams from the tournament. Captain only. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("tournament-teams", userId, 30, PER_HOUR);
  const { id, teamId } = await context.params;

  const result = await unregisterTeam(id, teamId, userId);
  if (!result.ok) {
    if (result.error === "tournament_not_found") throw notFound("tournament_not_found");
    if (result.error === "not_captain") throw forbidden("not_captain");
    throw conflict("not_registered");
  }

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
