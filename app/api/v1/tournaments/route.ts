import { enforceRateLimit, PER_DAY } from "@/lib/api/rate-limit";
import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { toTournamentCardDto } from "@/lib/api/serializers/tournament";
import { parseJson } from "@/lib/api/validate";
import { fetchTournamentDetail } from "@/lib/services/tournament-detail-queries";
import { fetchTournaments } from "@/lib/services/tournament-queries";
import { createTournament } from "@/lib/services/tournaments";

/**
 * All tournaments with their computed status. The client filters into the
 * upcoming / ongoing / ended tabs in memory, so switching tabs is instant.
 */
export const GET = handler(async (request: Request) => {
  await requireOnboarded(request);

  const tournaments = await fetchTournaments();

  return ok({ tournaments: tournaments.map(toTournamentCardDto) });
});

const createSchema = z
  .object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .strict();

/** Creates a tournament; the caller becomes its creator (the result recorder). */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("create-tournament", userId, 10, PER_DAY);
  const input = await parseJson(request, createSchema);

  const result = await createTournament(userId, input);
  if (!result.ok) throw badRequest();

  const detail = await fetchTournamentDetail(result.tournamentId, userId);
  if (!detail) throw notFound("tournament_not_found");

  return ok(detail);
});
