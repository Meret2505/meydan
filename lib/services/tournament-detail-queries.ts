import { prisma } from "@/lib/prisma";
import {
  toTournamentDetailDto,
  type TournamentDetailDto,
} from "@/lib/api/serializers/tournament-detail";

/**
 * Full tournament detail with the viewer's context (creator flag + the teams
 * they captain). Shared by the GET route and every write route, so a register
 * or a recorded result can return the new state in one round-trip.
 */
export async function fetchTournamentDetail(
  id: string,
  userId: string,
): Promise<TournamentDetailDto | null> {
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
  if (!tr) return null;

  const captaincies = await prisma.teamMember.findMany({
    where: { userId, isCaptain: true },
    select: { team: { select: { id: true, name: true } } },
  });

  return toTournamentDetailDto(tr, {
    userId,
    captainOf: captaincies.map((c) => c.team),
  });
}
