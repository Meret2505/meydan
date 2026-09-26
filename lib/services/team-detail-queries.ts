import { prisma } from "@/lib/prisma";
import { getPlayerStatsFor } from "@/lib/stats";
import type { TeamDetailDto } from "@/lib/api/serializers/team-detail";
import { isScoreCounted } from "@/lib/services/match-state";
import { MIN_ROSTER_TO_ARRANGE_MATCH } from "@/lib/services/team-authz";

/** What a win/loss tally needs off a game row. */
const SCORE_COLUMNS = {
  scoreHome: true,
  scoreAway: true,
  scoreReportedAt: true,
  scoreConfirmedAt: true,
} as const;

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
        include: { user: { select: { id: true, name: true, position: true } } },
        orderBy: [{ isCaptain: "desc" }, { joinedAt: "asc" }],
      },
      // Both sides. Until now only `games` was read — the home relation —
      // through a column nothing ever wrote, which is why every team's
      // record has read 0-0-0 since the app shipped.
      games: {
        where: { status: "COMPLETED" },
        select: SCORE_COLUMNS,
      },
      awayGames: {
        where: { status: "COMPLETED" },
        select: SCORE_COLUMNS,
      },
    },
  });
  if (!team) return null;

  // A score counts once both captains agree, or once three days pass with
  // no objection — asked of the row rather than of a materialised flag, so
  // the answer is right even if the nightly pass has never run. That
  // dependency is exactly what left these numbers at zero before.
  const now = new Date();
  let wins = 0;
  let losses = 0;
  let draws = 0;
  const tally = (ours: number, theirs: number) => {
    if (ours > theirs) wins++;
    else if (ours < theirs) losses++;
    else draws++;
  };
  for (const g of team.games) {
    if (!isScoreCounted(g, now)) continue;
    tally(g.scoreHome!, g.scoreAway!);
  }
  for (const g of team.awayGames) {
    // The same columns read from the other end of the pitch.
    if (!isScoreCounted(g, now)) continue;
    tally(g.scoreAway!, g.scoreHome!);
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

  // Teams the viewer captains that are eligible to challenge this one. The
  // roster floor is re-checked when the challenge is actually sent — a team
  // can shrink — but offering a button that always fails would be worse.
  const challengeableBy = viewerId
    ? (
        await prisma.teamMember.findMany({
          where: { userId: viewerId, isCaptain: true, teamId: { not: id } },
          select: {
            team: { select: { id: true, name: true, _count: { select: { members: true } } } },
          },
        })
      )
        .filter((m) => m.team._count.members >= MIN_ROSTER_TO_ARRANGE_MATCH)
        .map((m) => ({ id: m.team.id, name: m.team.name }))
    : [];

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
    challengeableBy,
  };
}
