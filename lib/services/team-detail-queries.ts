import { prisma } from "@/lib/prisma";
import { getPlayerStatsFor } from "@/lib/stats";
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

  // One grouped query for the whole roster. This was a getPlayerStats call per
  // member — concurrent, but still one query each on a single pooled
  // connection, and it ran on every team open, create and member change.
  const statsByUser = await getPlayerStatsFor(team.members.map((m) => m.userId));
  const members = team.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    position: m.user.position,
    isCaptain: m.isCaptain,
    // Absent from the map means no attendance recorded at all, which is a null
    // rate ("new"), not a zero one.
    attendanceRate: statsByUser.get(m.userId)?.attendanceRate ?? null,
  }));

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
