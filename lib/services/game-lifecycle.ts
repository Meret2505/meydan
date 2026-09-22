import { prisma } from "@/lib/prisma";

/**
 * Closing out games that have been played.
 *
 * Nothing used to move a game out of OPEN: the feed only ever asked for
 * `scheduledAt >= now`, so the moment kickoff passed a game vanished from
 * every screen and sat in the database as an open game forever. `COMPLETED`
 * was reached only through the web result form, which by then had no link
 * pointing at it. The consequences were quiet but real — no game ever landed
 * in a player's history, and `joinGame` (which checks status, not the clock)
 * would still accept a join for last week's match.
 *
 * A game is considered played once this long has passed since kickoff. Five-a-
 * side runs an hour or two; three hours is comfortably past the end without
 * closing a game while people are still on the pitch.
 */
export const PLAYED_AFTER_MS = 3 * 60 * 60 * 1000;

/** Kickoffs at or before this instant count as played. Pure, so it is tested. */
export function playedCutoff(now: Date): Date {
  return new Date(now.getTime() - PLAYED_AFTER_MS);
}

export type ClosePastGamesResult = { closed: number; gameIds: string[] };

/**
 * Marks every played-but-still-open game COMPLETED.
 *
 * Scores stay null: a completed game without a recorded result is exactly what
 * this is — played, with nobody having filled in what happened. Attendance is
 * likewise untouched, so nobody is credited or blamed for a game the organizer
 * never marked.
 *
 * Idempotent: the `status` filter means a second run in the same hour closes
 * nothing, so a retried or overlapping cron is harmless.
 */
export async function closePastGames(now: Date = new Date()): Promise<ClosePastGamesResult> {
  const cutoff = playedCutoff(now);

  const played = await prisma.game.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      scheduledAt: { lte: cutoff },
    },
    select: { id: true },
    // A bounded batch: if a backlog ever builds up (this shipped long after
    // the first games were played), it drains over successive runs instead of
    // timing out the function.
    take: 500,
  });
  if (played.length === 0) return { closed: 0, gameIds: [] };

  const gameIds = played.map((g) => g.id);
  const { count } = await prisma.game.updateMany({
    // Re-checking the status here rather than trusting the read above keeps two
    // overlapping runs from both counting the same game.
    where: { id: { in: gameIds }, status: { in: ["OPEN", "FULL"] } },
    data: { status: "COMPLETED" },
  });

  return { closed: count, gameIds };
}
