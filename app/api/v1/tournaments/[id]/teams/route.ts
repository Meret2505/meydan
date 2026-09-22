import { enforceRateLimit, PER_HOUR } from "@/lib/api/rate-limit";
import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";
import { registerTeam } from "@/lib/services/tournaments";

type Context = { params: Promise<{ id: string }> };

const registerSchema = z.object({ teamId: z.string() }).strict();

/**
 * Enters one of the caller's teams into the tournament. Captain only — the
 * server checks, rather than trusting the client to only offer eligible teams.
 * Returns the updated detail so the client re-renders standings and roster.
 */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("tournament-teams", userId, 30, PER_HOUR);
  const { id } = await context.params;
  const { teamId } = await parseJson(request, registerSchema);

  const result = await registerTeam(id, teamId, userId);
  if (!result.ok) {
    if (result.error === "tournament_not_found") throw notFound("tournament_not_found");
    if (result.error === "team_not_found") throw notFound("team_not_found");
    if (result.error === "not_captain") throw forbidden("not_captain");
    throw conflict("tournament_cancelled");
  }

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
