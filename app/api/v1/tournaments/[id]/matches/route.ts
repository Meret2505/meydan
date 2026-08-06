import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";
import { recordMatchResult } from "@/lib/services/tournaments";

type Context = { params: Promise<{ id: string }> };

const matchSchema = z
  .object({
    homeTeamId: z.string(),
    awayTeamId: z.string(),
    scoreHome: z.number(),
    scoreAway: z.number(),
    round: z.string().nullable().optional(),
  })
  .strict();

/**
 * Records a played match. Tournament creator only.
 *
 * Idempotent against double-submit: re-posting an identical result returns the
 * existing match rather than inserting a duplicate that would double-count in
 * the standings.
 */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;
  const input = await parseJson(request, matchSchema);

  const result = await recordMatchResult(id, userId, input);
  if (!result.ok) {
    if (result.error === "tournament_not_found") throw notFound("tournament_not_found");
    if (result.error === "not_creator") throw forbidden("not_creator");
    if (result.error === "invalid_input") throw badRequest();
    if (result.error === "tournament_cancelled") throw conflict("tournament_cancelled");
    throw conflict("teams_not_registered");
  }

  const detail = await fetchTournamentDetail(id, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
