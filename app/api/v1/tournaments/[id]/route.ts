import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one tournament: teams, standings, matches, viewer context. */
export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
