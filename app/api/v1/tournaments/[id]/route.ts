import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { toTournamentDetailDto } from "@/lib/api/serializers/tournament-detail";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one tournament: teams, standings, and matches. */
export const GET = handler(async (request: Request, context: Context) => {
  await requireOnboarded(request);
  const { id } = await context.params;

  const tr = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: { team: { include: { _count: { select: { members: true } } } } },
        orderBy: { joinedAt: "asc" },
      },
      matches: {
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!tr) throw notFound("tournament_not_found");

  return ok(toTournamentDetailDto(tr));
});
