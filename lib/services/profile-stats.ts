import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";

/**
 * The profile page's stats block: attendance aggregate plus the last few
 * completed games. Mirrors the web profile page's ProfileStats so the two
 * cannot disagree.
 */

export type RecentGameDto = {
  id: string;
  scheduledAt: string;
  venue: string;
  /** Null when the organizer never marked attendance for this player. */
  attended: boolean | null;
};

export type ProfileStatsDto = {
  /** Percent, or null when the player has no marked games yet. */
  attendanceRate: number | null;
  /** Games actually attended. */
  gamesPlayed: number;
  /** Games joined that have a recorded attendance verdict. */
  totalJoined: number;
  recent: RecentGameDto[];
};

/** How many recent games the profile shows — matches the web's `take: 3`. */
const RECENT_LIMIT = 3;

export async function getProfileStats(userId: string): Promise<ProfileStatsDto> {
  const [stats, recent] = await Promise.all([
    getPlayerStats(userId),
    prisma.gameParticipant.findMany({
      where: { userId, game: { status: "COMPLETED" } },
      include: { game: { include: { field: { select: { name: true } } } } },
      orderBy: { joinedAt: "desc" },
      take: RECENT_LIMIT,
    }),
  ]);

  return {
    attendanceRate: stats.attendanceRate,
    gamesPlayed: stats.gamesPlayed,
    totalJoined: stats.totalJoined,
    recent: recent.map((p) => ({
      id: p.game.id,
      scheduledAt: p.game.scheduledAt.toISOString(),
      // Same fallback the feed uses: a catalogue field's name, else the
      // free-text venue the organizer typed.
      venue: p.game.field?.name ?? p.game.fieldName ?? "—",
      attended: p.attended,
    })),
  };
}
