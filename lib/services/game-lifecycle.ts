import { sendPush } from "@/lib/fcm";
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
 * never marked. The organizer gets one RESULT_NEEDED notification, which opens
 * the write-up screen; recording is optional and nothing chases them.
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
    select: { id: true, organizerId: true },
    // A bounded batch: a day's worth of games is far under this, and if a
    // backlog ever builds up (this shipped long after the first games were
    // played) it drains over successive nights instead of timing out.
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

  // One nudge per closed game, now that the app has a screen to act on it.
  // Writing the result is optional — this is the only reminder the organizer
  // gets, and nothing chases them afterwards.
  //
  // Not exactly-once under two runs overlapping (updateMany cannot report
  // which rows it touched), but a nightly job that finishes in milliseconds
  // does not overlap, and the worst case is a duplicate nudge rather than a
  // wrong one.
  if (count > 0) {
    await prisma.notification.createMany({
      data: played.map((game) => ({
        userId: game.organizerId,
        type: "RESULT_NEEDED" as const,
        title: "Игра прошла",
        body: "Отметь, кто пришёл — это влияет на рейтинг игроков.",
        data: { gameId: game.id },
      })),
    });
    await pushResultReminders(played);
  }

  return { closed: count, gameIds };
}

/**
 * Pushes the nudge as well as writing it in-app.
 *
 * Without this the reminder only existed inside the app, which is no reminder
 * at all: the whole point is to reach an organizer who has no reason to open
 * the app again — the game has already vanished from every feed. Committed
 * notifications come first and the push is best-effort, the same order
 * joinGame uses.
 */
async function pushResultReminders(games: { id: string; organizerId: string }[]): Promise<void> {
  const organizers = await prisma.user.findMany({
    where: { id: { in: [...new Set(games.map((g) => g.organizerId))] }, fcmToken: { not: null } },
    select: { id: true, fcmToken: true, locale: true },
  });
  if (organizers.length === 0) return;

  const byId = new Map(organizers.map((o) => [o.id, o]));
  await Promise.all(
    games.map(async (game) => {
      const organizer = byId.get(game.organizerId);
      if (!organizer) return;
      const ru = organizer.locale !== "tm";
      await sendPush(
        organizer.fcmToken,
        ru ? "Игра прошла" : "Oýun geçdi",
        ru
          ? "Отметь, кто пришёл — это влияет на рейтинг игроков."
          : "Kim geldi belläň — bu oýunçylaryň reýtingine täsir edýär.",
        { gameId: game.id, url: `/${organizer.locale}/games/${game.id}` },
      );
    }),
  );
}
