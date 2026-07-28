import { requireOnboarded } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { toTournamentCardDto } from "@/lib/api/serializers/tournament";
import { fetchTournaments } from "@/lib/services/tournament-queries";

/**
 * All tournaments with their computed status. The client filters into the
 * upcoming / ongoing / ended tabs in memory, so switching tabs is instant.
 */
export const GET = handler(async (request: Request) => {
  await requireOnboarded(request);

  const tournaments = await fetchTournaments();

  return ok({ tournaments: tournaments.map(toTournamentCardDto) });
});
