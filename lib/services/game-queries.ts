import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { matchActionsFor } from "@/lib/services/match-actions";
import { MIN_ROSTER_TO_ARRANGE_MATCH } from "@/lib/services/team-authz";

/**
 * Read paths for the games feed and detail screens.
 *
 * Query shapes mirror the ones the web pages run inline, so both surfaces show
 * the same games. Kept separate from games.ts (which owns mutations) to keep
 * each file focused.
 */

/** Matches the web feed: only upcoming games that can still be joined. */
export const upcomingAndJoinable = () => ({
  scheduledAt: { gte: new Date() },
  status: { in: ["OPEN" as const, "FULL" as const] },
});

/**
 * Ordinary games only — no team matches.
 *
 * Named and exported so `grep OPEN_GAMES_ONLY` enumerates every place that
 * must not see a match. The web renders games through three separate inline
 * queries of its own, none of which share this module, and a match reaching
 * one of them would be drawn as a normal game with a Join button on it. A
 * query that omits this now looks different from its neighbours.
 */
export const OPEN_GAMES_ONLY = { type: "OPEN" as const };

const feedInclude = {
  // A card shows the venue name and its district; the rest of the row —
  // photos, hours, contacts, attributes, translations, coordinates — was
  // being fetched for every one of up to 100 games.
  field: { select: { name: true, district: true } },
  organizer: { select: { id: true, name: true } },
  // The card renders initials from names, nothing else.
  participants: {
    include: { user: { select: { id: true, name: true } } },
  },
  // Both sides of a team match. Null on an ordinary game, and a card draws
  // crests instead of an avatar stack when they are set.
  team: { select: { id: true, name: true, color: true } },
  awayTeam: { select: { id: true, name: true, color: true } },
} as const;

export type FeedGame = Awaited<ReturnType<typeof fetchOpenGames>>[number];

async function fetchOpenGames(userId: string, district: string | null) {
  return prisma.game.findMany({
    where: {
      ...upcomingAndJoinable(),
      // Games at a field in the user's district, plus custom-venue games which
      // have no field to filter on.
      ...(district ? { OR: [{ field: { district } }, { field: null }] } : {}),
      AND: [
        {
          OR: [
            {
              ...OPEN_GAMES_ONLY,
              participants: { none: { userId } },
              organizerId: { not: userId },
            },
            // An open call looking for an opponent. Shown to everyone, not
            // only captains: hiding it would make the feature invisible to
            // exactly the players who might form a team to answer it. The
            // card explains who may act.
            {
              type: "TEAM_MATCH" as const,
              awayTeamId: null,
              declinedAt: null,
              team: { members: { none: { userId } } },
            },
          ],
        },
      ],
    },
    include: feedInclude,
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
}

/**
 * The feed, in the same two buckets the web board renders.
 *
 * Both lists are capped at 50 with no pagination, matching the existing web
 * behaviour. Chip filters (today / five-a-side / needs-goalie) are applied
 * client-side over this one response, exactly as GamesBoard does.
 */
export async function fetchGamesFeed(userId: string): Promise<{
  open: FeedGame[];
  mine: FeedGame[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { district: true },
  });

  const [open, mine] = await Promise.all([
    fetchOpenGames(userId, user?.district ?? null),
    prisma.game.findMany({
      where: {
        ...upcomingAndJoinable(),
        OR: [
          { organizerId: userId },
          { participants: { some: { userId } } },
          // The home team sees its own match from the moment it is arranged,
          // open call included.
          { type: "TEAM_MATCH" as const, team: { members: { some: { userId } } } },
          // The away side only once it is agreed — a squad member cannot act
          // on a pending challenge, and showing "you have a match" that then
          // evaporates on a decline is worse than silence.
          {
            type: "TEAM_MATCH" as const,
            agreedAt: { not: null },
            awayTeam: { members: { some: { userId } } },
          },
          // Except the captain being asked, who is the one person who has to
          // see it before it is agreed.
          {
            type: "TEAM_MATCH" as const,
            agreedAt: null,
            declinedAt: null,
            awayTeam: { members: { some: { userId, isCaptain: true } } },
          },
        ],
      },
      include: feedInclude,
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
  ]);

  return { open, mine };
}

export type GameDetail = NonNullable<Awaited<ReturnType<typeof getGameDetail>>>;

/** Full detail for one game, including the organizer's reliability stats. */
export async function getGameDetail(gameId: string, userId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      field: { select: { name: true, district: true } },
      // Whole User rows (password hash, fcm token, email) were fetched to
      // read four columns. The serializers never leaked them, but the pooler
      // carried them on every game open.
      organizer: { select: { id: true, name: true, avatar: true, phone: true } },
      team: { select: { id: true, name: true, color: true } },
      awayTeam: { select: { id: true, name: true, color: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true, position: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!game) return null;

  const organizerStats = await getPlayerStats(game.organizerId);

  // Which side the viewer is on, and whether they speak for it. Computed
  // here rather than by the client: TeamDetailDto.isCaptain is about *that*
  // team, and the whole class of bug is a client deciding it may act because
  // it captains a different one.
  const sides = [game.teamId, game.awayTeamId].filter((id): id is string => id !== null);
  const memberships = sides.length
    ? await prisma.teamMember.findMany({
        where: { userId, teamId: { in: sides } },
        select: { teamId: true, isCaptain: true },
      })
    : [];
  const home = memberships.find((m) => m.teamId === game.teamId);
  const away = memberships.find((m) => m.teamId === game.awayTeamId);

  // Teams the viewer could answer an open call with: ones they captain, big
  // enough to play, and not the side that called it.
  const acceptableBy =
    game.type === "TEAM_MATCH" && game.awayTeamId === null && !home
      ? (
          await prisma.teamMember.findMany({
            where: {
              userId,
              isCaptain: true,
              ...(game.teamId ? { teamId: { not: game.teamId } } : {}),
            },
            select: {
              team: { select: { id: true, name: true, _count: { select: { members: true } } } },
            },
          })
        )
          .filter((m) => m.team._count.members >= MIN_ROSTER_TO_ARRANGE_MATCH)
          .map((m) => ({ id: m.team.id, name: m.team.name }))
      : [];

  return {
    game,
    organizerStats,
    isOrganizer: game.organizerId === userId,
    joined: game.participants.some((p) => p.userId === userId),
    viewerSide: home ? ("HOME" as const) : away ? ("AWAY" as const) : null,
    viewerIsCaptain: (home?.isCaptain ?? false) || (away?.isCaptain ?? false),
    acceptableBy,
    viewerActions:
      game.type === "TEAM_MATCH"
        ? matchActionsFor(game, {
            captainsHome: home?.isCaptain ?? false,
            captainsAway: away?.isCaptain ?? false,
            canAnswerOpenCall: acceptableBy.length > 0,
          })
        : [],
  };
}
