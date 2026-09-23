import { enforceRateLimit, PER_DAY } from "@/lib/api/rate-limit";
import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, notFound } from "@/lib/api/errors";
import { handler, ok, okRevalidatable } from "@/lib/api/response";
import { toTeamCardDto } from "@/lib/api/serializers/team";
import { parseJson } from "@/lib/api/validate";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";
import { fetchTeams } from "@/lib/services/team-queries";
import { createTeam } from "@/lib/services/teams";

/**
 * The teams tab data in the web's two buckets: `mine` (the user's teams, shown
 * as cards) and `others` (the city ranking). Returned together in one request.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);

  const { myTeams, others } = await fetchTeams(userId);

  return okRevalidatable(request, {
    mine: myTeams.map((team) => toTeamCardDto(team, true)),
    others: others.map((team) => toTeamCardDto(team, false)),
  });
});

const createSchema = z
  .object({
    name: z.string(),
    district: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
  })
  .strict();

/** Creates a team with the caller as captain; returns the new team's detail. */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("create-team", userId, 10, PER_DAY);
  const input = await parseJson(request, createSchema);

  const result = await createTeam(userId, input);
  if (!result.ok) throw badRequest();

  const detail = await fetchTeamDetail(result.teamId, userId);
  if (!detail) throw notFound("team_not_found");

  return ok(detail);
});
