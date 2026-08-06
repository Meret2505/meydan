import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";
import { removeMember } from "@/lib/services/teams";

type Context = { params: Promise<{ id: string; userId: string }> };

/**
 * Captain removes a player from the roster. Returns the updated team detail so
 * the client re-renders the roster without a follow-up GET.
 *
 * A captain cannot remove themselves — that would leave the team without one,
 * the same hole `DELETE /members` guards for leaving.
 */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId: callerId } = await requireOnboarded(request);
  const { id, userId: targetId } = await context.params;

  const result = await removeMember(id, callerId, targetId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("team_not_found");
    if (result.error === "not_captain") throw forbidden("not_captain");
    if (result.error === "cannot_remove_self") {
      throw forbidden("cannot_remove_self");
    }
    throw conflict("not_member");
  }

  const detail = await fetchTeamDetail(id, callerId);
  if (!detail) throw notFound("team_not_found");

  return ok(detail);
});
