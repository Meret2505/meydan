import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";

/**
 * Read paths for the games feed and detail screens.
 *
 * Query shapes mirror the ones the web pages run inline, so both surfaces show
 * the same games. Kept separate from games.ts (which owns mutations) to keep
 * each file focused.
 */

/** Matches the web feed: only upcoming games that can still be joined. */
const upcomingAndJoinable = () => ({
  scheduledAt: { gte: new Date() },
  status: { in: ["OPEN" as const, "FULL" as const] },
});

const feedInclude = {
  field: true,
  organizer: { select: { id: true, name: true } },
  participants: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
  },
} as const;

export type FeedGame = Awaited<ReturnType<typeof fetchOpenGames>>[number];

async function fetchOpenGames(userId: string, district: string | null) {
  return prisma.game.findMany({
    where: {
      ...upcomingAndJoinable(),
      participants: { none: { userId } },
      organizerId: { not: userId },
      // Games at a field in the user's district, plus custom-venue games which
      // have no field to filter on.
      ...(district ? { OR: [{ field: { district } }, { field: null }] } : {}),
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
        OR: [{ organizerId: userId }, { participants: { some: { userId } } }],
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
      field: true,
      organizer: true,
      participants: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!game) return null;

  const organizerStats = await getPlayerStats(game.organizerId);

  return {
    game,
    organizerStats,
    isOrganizer: game.organizerId === userId,
    joined: game.participants.some((p) => p.userId === userId),
  };
}
