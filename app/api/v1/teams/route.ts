import { requireOnboarded } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { toTeamCardDto } from "@/lib/api/serializers/team";
import { fetchTeams } from "@/lib/services/team-queries";

/**
 * The teams tab data in the web's two buckets: `mine` (the user's teams, shown
 * as cards) and `others` (the city ranking). Returned together in one request.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);

  const { myTeams, others } = await fetchTeams(userId);

  return ok({
    mine: myTeams.map((team) => toTeamCardDto(team, true)),
    others: others.map((team) => toTeamCardDto(team, false)),
  });
});
