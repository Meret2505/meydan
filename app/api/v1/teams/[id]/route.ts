import { requireOnboarded } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";
import { disbandTeam } from "@/lib/services/teams";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one team: record + roster. */
export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await fetchTeamDetail(id, userId);
  if (!detail) throw notFound("team_not_found");

  return ok(detail);
});

/**
 * Disbands the team — captain only, and the only way a captain exits.
 *
 * Unlike a cancelled game, the team row is really deleted, so there is nothing
 * to return; the client navigates back to the teams list.
 */
export const DELETE = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const result = await disbandTeam(id, userId);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("team_not_found");
    if (result.error === "not_captain") throw forbidden("not_captain");
    // The team still has games or tournament matches referencing it; those
    // rows have no cascade, so the team cannot be deleted.
    throw conflict("team_in_use");
  }

  return ok({ disbanded: true });
});
