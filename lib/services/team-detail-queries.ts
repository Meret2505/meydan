import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import type { TeamDetailDto } from "@/lib/api/serializers/team-detail";

/**
 * Full team detail: the roster (captain first) with each member's attendance,
 * plus the aggregate win/loss/points record from completed games. Mirrors the
 * web team page's computation.
 *
 * `viewerId` adds the caller's membership context, which the mobile client
 * needs to decide between the join and leave actions.
 */
export async function fetchTeamDetail(
  id: string,
  viewerId?: string,
): Promise<TeamDetailDto | null> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
        orderBy: [{ isCaptain: "desc" }, { joinedAt: "asc" }],
      },
      games: {
        where: { status: "COMPLETED" },
        select: { scoreHome: true, scoreAway: true },
      },
    },
  });
  if (!team) return null;

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of team.games) {
    if (g.scoreHome === null || g.scoreAway === null) continue;
    if (g.scoreHome > g.scoreAway) wins++;
    else if (g.scoreHome < g.scoreAway) losses++;
    else draws++;
  }

  const members = await Promise.all(
    team.members.map(async (m) => {
      const stats = await getPlayerStats(m.userId);
      return {
        id: m.user.id,
        name: m.user.name,
        position: m.user.position,
        isCaptain: m.isCaptain,
        attendanceRate: stats.attendanceRate,
      };
    }),
  );

  const viewerMembership = viewerId
    ? team.members.find((m) => m.userId === viewerId)
    : undefined;

  return {
    id: team.id,
    name: team.name,
    color: team.color,
    district: team.district,
    memberCount: team.members.length,
    wins,
    losses,
    points: wins * 3 + draws,
    members,
    isMember: !!viewerMembership,
    isCaptain: viewerMembership?.isCaptain ?? false,
  };
}
