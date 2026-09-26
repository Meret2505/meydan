import { prisma } from "@/lib/prisma";
import { confirmCutoff } from "@/lib/services/match-state";

/**
 * The nightly tidy-up for matches, run from the existing close-past-games
 * job. Vercel's Hobby plan allows only daily schedules and three are already
 * spoken for, so this rides along rather than asking for a fourth — and daily
 * granularity suits a three-day rule.
 *
 * Both passes are **optimisations, not correctness**. `isScoreCounted` already
 * answers the three-day question by reading the row, so team records are
 * right the moment the window closes whether or not this ever runs. What the
 * pass adds is a cheap indexed read and, more importantly, the notification:
 * without it the reporting captain never learns their score went through.
 *
 * That split is deliberate. Team records read 0-0-0 for the life of the app
 * because they were made to depend on something nothing wrote; hanging them
 * on a cron would be the same failure with a new shape.
 */

export type MatchSweepResult = {
  confirmed: number;
  declined: number;
};

export async function sweepMatches(now: Date = new Date()): Promise<MatchSweepResult> {
  const [confirmed, declined] = await Promise.all([
    confirmUnansweredScores(now),
    declineForgottenChallenges(now),
  ]);
  return { confirmed, declined };
}

/** Scores nobody objected to inside the window become the record. */
async function confirmUnansweredScores(now: Date): Promise<number> {
  const due = await prisma.game.findMany({
    where: {
      type: "TEAM_MATCH",
      scoreConfirmedAt: null,
      scoreReportedAt: { lte: confirmCutoff(now) },
    },
    select: { id: true, scoreReportedByTeamId: true },
    take: 500,
  });
  if (due.length === 0) return 0;

  const { count } = await prisma.game.updateMany({
    where: { id: { in: due.map((g) => g.id) }, scoreConfirmedAt: null },
    // No scoreConfirmedById: null against a set scoreConfirmedAt is what
    // "nobody answered, so it stands" looks like in the row.
    data: { scoreConfirmedAt: now },
  });

  const reporters = due.filter(
    (g): g is { id: string; scoreReportedByTeamId: string } =>
      g.scoreReportedByTeamId !== null,
  );
  if (count > 0 && reporters.length > 0) {
    const captains = await prisma.teamMember.findMany({
      where: { teamId: { in: reporters.map((g) => g.scoreReportedByTeamId) }, isCaptain: true },
      select: { userId: true, teamId: true },
    });
    await prisma.notification.createMany({
      data: reporters.flatMap((game) =>
        captains
          .filter((c) => c.teamId === game.scoreReportedByTeamId)
          .map((c) => ({
            userId: c.userId,
            type: "MATCH_RESULT_CONFIRMED" as const,
            title: "Счёт засчитан",
            body: "Соперник не ответил за три дня — счёт пошёл в статистику.",
            data: { gameId: game.id },
          })),
      ),
    });
  }

  return count;
}

/**
 * A challenge whose kickoff has passed with no answer is declined.
 *
 * Otherwise it sits pending for ever: only the challenged captain can answer
 * it, and one who stopped opening the app would leave both teams looking at
 * a match that can never happen and can never be tidied away.
 */
async function declineForgottenChallenges(now: Date): Promise<number> {
  const { count } = await prisma.game.updateMany({
    where: {
      type: "TEAM_MATCH",
      status: { in: ["OPEN", "FULL"] },
      awayTeamId: { not: null },
      agreedAt: null,
      declinedAt: null,
      scheduledAt: { lte: now },
    },
    data: { declinedAt: now, status: "CANCELLED" },
  });
  return count;
}
