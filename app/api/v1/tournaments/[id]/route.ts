import { requireOnboarded } from "@/lib/api/auth";
import { forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";
import { cancelTournament } from "@/lib/services/tournaments";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one tournament: teams, standings, matches, viewer context. */
export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});

/**
 * Cancels a tournament. Creator only, and soft — the row stays so entered
 * teams keep seeing it with the reason, which is why this returns the updated
 * detail rather than an empty 204. Idempotent.
 */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const result = await cancelTournament(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("tournament_not_found");
    throw forbidden("not_creator");
  }

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
