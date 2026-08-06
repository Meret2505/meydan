import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one team: record + roster. */
export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await fetchTeamDetail(id, userId);
  if (!detail) throw notFound("team_not_found");

  return ok(detail);
});
