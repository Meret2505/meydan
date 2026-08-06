import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";
import { joinTeam, leaveTeam } from "@/lib/services/teams";

type Context = { params: Promise<{ id: string }> };

/**
 * Both handlers return the updated team detail rather than a bare
 * acknowledgement — joining or leaving changes the roster, the member count and
 * the viewer's own membership flags, so returning the new state saves the
 * client a follow-up GET and removes any window showing a stale roster.
 */
async function respondWithTeam(teamId: string, userId: string) {
  const detail = await fetchTeamDetail(teamId, userId);
  if (!detail) throw notFound("team_not_found");
  return ok(detail);
}

/** Join a team. Idempotent — joining twice succeeds. */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const result = await joinTeam(id, userId);
  if (!result.ok) throw notFound("team_not_found");

  return respondWithTeam(id, userId);
});

/** Leave a team. The captain cannot leave — disbanding is their exit. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const result = await leaveTeam(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("team_not_found");
    if (result.error === "captain_cannot_leave") {
      throw forbidden("captain_cannot_leave");
    }
    throw conflict("not_member");
  }

  return respondWithTeam(id, userId);
});
