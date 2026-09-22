import { prisma } from "./prisma";

export type PlayerStats = {
  gamesPlayed: number;
  attendanceRate: number | null;
  totalJoined: number;
};

/**
 * The attendance figures every profile, team and game screen shows. Pure, so
 * the arithmetic is unit-tested without a database.
 *
 * A player with nothing recorded gets `null`, not `0` — "no data yet" and
 * "never turned up" are different claims, and [attendanceTier] maps them to
 * "new" and "poor" respectively.
 */
export function playerStatsFrom(attended: number, total: number): PlayerStats {
  return {
    gamesPlayed: attended,
    attendanceRate: total > 0 ? Math.round((attended / total) * 100) : null,
    totalJoined: total,
  };
}

/** One row of `groupBy({ by: ["userId", "attended"] })`. */
export type AttendanceTally = {
  userId: string;
  attended: boolean | null;
  _count: { _all: number };
};

/**
 * Folds one grouped query into per-user stats. Users with no recorded
 * attendance are simply absent from the map, so a caller can tell them apart
 * from a 0% record.
 */
export function foldAttendance(rows: AttendanceTally[]): Map<string, PlayerStats> {
  const tallies = new Map<string, { attended: number; total: number }>();
  for (const row of rows) {
    // The query filters `attended: { not: null }`, but a caller could pass
    // unfiltered rows; a pending row is not a judgement either way.
    if (row.attended === null) continue;
    const tally = tallies.get(row.userId) ?? { attended: 0, total: 0 };
    tallies.set(row.userId, {
      attended: tally.attended + (row.attended ? row._count._all : 0),
      total: tally.total + row._count._all,
    });
  }

  const stats = new Map<string, PlayerStats>();
  for (const [userId, { attended, total }] of tallies) {
    stats.set(userId, playerStatsFrom(attended, total));
  }
  return stats;
}

/**
 * One player's attendance.
 *
 * Two counts rather than fetching every participation row to count two numbers
 * in application code: with the (userId, attended) index this is answered from
 * the index alone, and it stays that way as a season's worth of games piles up.
 */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const [attended, total] = await Promise.all([
    prisma.gameParticipant.count({ where: { userId, attended: true } }),
    prisma.gameParticipant.count({ where: { userId, attended: { not: null } } }),
  ]);
  return playerStatsFrom(attended, total);
}

/**
 * [getPlayerStats] for a whole roster in a single query.
 *
 * A team screen used to call getPlayerStats once per member — concurrently,
 * but still one query each, all sharing one pooled connection. Rosters read
 * the same either way; this just stops the round trips multiplying.
 */
export async function getPlayerStatsFor(
  userIds: string[],
): Promise<Map<string, PlayerStats>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.gameParticipant.groupBy({
    by: ["userId", "attended"],
    where: { userId: { in: userIds }, attended: { not: null } },
    _count: { _all: true },
  });
  return foldAttendance(rows);
}

export function attendanceTier(rate: number | null): "reliable" | "ok" | "poor" | "new" {
  if (rate === null) return "new";
  if (rate >= 80) return "reliable";
  if (rate >= 50) return "ok";
  return "poor";
}
