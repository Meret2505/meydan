import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/fcm";
import { isCaptainOf } from "@/lib/services/team-authz";
import { matchStateOf } from "@/lib/services/match-state";

/**
 * Writing up a match: the score, who turned up, and the other captain's
 * answer.
 *
 * Separate from `recordGameResult` rather than a flag on it, for four
 * reasons that are about the contract and not about taste:
 *
 *   1. Half of that function is dead here. Its central rule — a score alone
 *      is fine, attendance alone is fine, neither is a rejection — inverts
 *      for a match, where the score is the point.
 *   2. Authorization is a different question, twice. Reporting asks "does
 *      this person captain either side"; confirming asks "do they captain
 *      the side that did *not* report". Neither is a variation of "are you
 *      the organizer".
 *   3. The idempotency is opposite. Re-recording an ordinary game is a
 *      deliberate feature; a write after a match's score is confirmed must
 *      be refused, and a re-report before confirmation restarts the clock.
 *   4. The error union would grow five codes the ordinary route can never
 *      produce but would still have to handle.
 *
 * The one genuine overlap — the 0..99 integer pair — is shared.
 */

const MAX_SCORE = 99;

export type MatchResultError =
  | "not_found"
  | "not_a_match"
  | "not_captain"
  | "not_played"
  | "already_confirmed"
  | "no_score_reported"
  | "cannot_answer_own_report"
  | "invalid_input";

export type MatchResultOutcome = { ok: true } | { ok: false; error: MatchResultError };

export type ReportMatchInput = {
  scoreHome?: number | null;
  scoreAway?: number | null;
  /** userId → turned up. Only the reporter's own side is accepted. */
  attended?: Record<string, boolean>;
};

/** The 0..99 pair, or null when it is not a usable score. */
export function parseScorePair(
  home: number | null | undefined,
  away: number | null | undefined,
): { home: number; away: number } | null {
  if (home === null || home === undefined || away === null || away === undefined) return null;
  for (const value of [home, away]) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SCORE) return null;
  }
  return { home, away };
}

/**
 * A captain enters the score, and ticks who from *their* side turned up.
 *
 * Scores are always home-relative — `scoreHome` belongs to the home team
 * whoever typed it — so the screen must label the boxes with team names
 * rather than "home" and "away".
 */
export async function reportMatchScore(
  gameId: string,
  userId: string,
  input: ReportMatchInput,
): Promise<MatchResultOutcome> {
  const score = parseScorePair(input.scoreHome, input.scoreAway);
  if (score === null) return { ok: false, error: "invalid_input" };

  const outcome = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: { select: { userId: true, teamId: true } } },
    });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.type !== "TEAM_MATCH") return { ok: false as const, error: "not_a_match" as const };
    if (game.scoreConfirmedAt !== null) {
      // A confirmed score is the historical record of a match both teams
      // agreed on. Reopening it would make confirmation mean nothing.
      return { ok: false as const, error: "already_confirmed" as const };
    }

    const state = matchStateOf(game);
    if (state !== "played" && state !== "score_reported") {
      return { ok: false as const, error: "not_played" as const };
    }

    const side = await sideOf(tx, game.teamId, game.awayTeamId, userId);
    if (side === null) return { ok: false as const, error: "not_captain" as const };

    // Only this captain's own players. Ticking the opposition's attendance
    // would let one side write the other's reliability ratings.
    const mine = new Set(
      game.participants.filter((p) => p.teamId === side).map((p) => p.userId),
    );
    for (const [participantId, attended] of Object.entries(input.attended ?? {})) {
      if (!mine.has(participantId)) continue;
      await tx.gameParticipant.updateMany({
        where: { gameId, userId: participantId },
        data: { attended },
      });
    }

    await tx.game.update({
      where: { id: gameId },
      data: {
        status: "COMPLETED",
        scoreHome: score.home,
        scoreAway: score.away,
        scoreReportedByTeamId: side,
        // Restarts the three days. A corrected score the other captain has
        // not seen yet should not inherit the old one's clock.
        scoreReportedAt: new Date(),
        scoreConfirmedAt: null,
        scoreConfirmedById: null,
      },
    });

    const other = side === game.teamId ? game.awayTeamId : game.teamId;
    return { ok: true as const, notify: other };
  });

  if (!outcome.ok) return outcome;
  if (outcome.notify) {
    await notifyCaptains(outcome.notify, {
      type: "MATCH_RESULT_REPORTED",
      title: "Счёт матча внесён",
      body: "Подтвердите счёт или отклоните его.",
      gameId,
      push: {
        ru: ["Счёт матча внесён", "Подтвердите счёт или отклоните его."],
        tm: ["Oýnuň hasaby girizildi", "Hasaby tassyklaň ýa-da ret ediň."],
      },
    });
  }
  return { ok: true };
}

/** The other captain agrees. From here the score counts and cannot move. */
export async function confirmMatchScore(
  gameId: string,
  userId: string,
): Promise<MatchResultOutcome> {
  const outcome = await prisma.$transaction(async (tx) => {
    const answer = await answerableBy(tx, gameId, userId);
    if (!answer.ok) return answer;

    await tx.game.update({
      where: { id: gameId },
      data: { scoreConfirmedAt: new Date(), scoreConfirmedById: userId },
    });
    return { ok: true as const, notify: answer.reportedBy };
  });

  if (!outcome.ok) return outcome;
  if (outcome.notify) {
    await notifyCaptains(outcome.notify, {
      type: "MATCH_RESULT_CONFIRMED",
      title: "Счёт подтверждён",
      body: "Соперник согласился со счётом.",
      gameId,
      push: {
        ru: ["Счёт подтверждён", "Соперник согласился со счётом."],
        tm: ["Hasap tassyklandy", "Garşydaş hasap bilen razylaşdy."],
      },
    });
  }
  return { ok: true };
}

/**
 * The other captain says the score is wrong.
 *
 * Without this, a captain looking at a score they know is wrong has only
 * silence — and silence confirms it after three days. Rejecting puts the
 * match back to "played, no score" so either of them can enter it again.
 */
export async function rejectMatchScore(
  gameId: string,
  userId: string,
): Promise<MatchResultOutcome> {
  const outcome = await prisma.$transaction(async (tx) => {
    const answer = await answerableBy(tx, gameId, userId);
    if (!answer.ok) return answer;

    await tx.game.update({
      where: { id: gameId },
      data: {
        scoreHome: null,
        scoreAway: null,
        scoreReportedByTeamId: null,
        scoreReportedAt: null,
      },
    });
    return { ok: true as const, notify: answer.reportedBy };
  });

  if (!outcome.ok) return outcome;
  if (outcome.notify) {
    await notifyCaptains(outcome.notify, {
      type: "MATCH_RESULT_REPORTED",
      title: "Счёт отклонён",
      body: "Соперник не согласен со счётом. Внесите его заново.",
      gameId,
      push: {
        ru: ["Счёт отклонён", "Соперник не согласен со счётом."],
        tm: ["Hasap ret edildi", "Garşydaş hasap bilen razy däl."],
      },
    });
  }
  return { ok: true };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Which of the two teams this person captains, or null for neither. */
async function sideOf(
  tx: Tx,
  homeTeamId: string | null,
  awayTeamId: string | null,
  userId: string,
): Promise<string | null> {
  if (homeTeamId !== null && (await isCaptainOf(homeTeamId, userId, tx))) return homeTeamId;
  if (awayTeamId !== null && (await isCaptainOf(awayTeamId, userId, tx))) return awayTeamId;
  return null;
}

/**
 * The shared guard behind confirm and reject: a reported score, and a caller
 * who captains the side that did not report it.
 */
async function answerableBy(
  tx: Tx,
  gameId: string,
  userId: string,
): Promise<
  | { ok: true; reportedBy: string }
  | { ok: false; error: MatchResultError }
> {
  const game = await tx.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, error: "not_found" };
  if (game.type !== "TEAM_MATCH") return { ok: false, error: "not_a_match" };
  if (game.scoreConfirmedAt !== null) return { ok: false, error: "already_confirmed" };
  if (game.scoreReportedAt === null || game.scoreReportedByTeamId === null) {
    return { ok: false, error: "no_score_reported" };
  }

  const answering =
    game.scoreReportedByTeamId === game.teamId ? game.awayTeamId : game.teamId;
  if (answering === null) return { ok: false, error: "not_found" };

  if (!(await isCaptainOf(answering, userId, tx))) {
    // Either they captain neither team, or they captain the side that
    // reported — which would make the confirmation worthless.
    const reporter = await isCaptainOf(game.scoreReportedByTeamId, userId, tx);
    return {
      ok: false,
      error: reporter ? "cannot_answer_own_report" : "not_captain",
    };
  }

  return { ok: true, reportedBy: game.scoreReportedByTeamId };
}

type MatchNotice = {
  type: "MATCH_RESULT_REPORTED" | "MATCH_RESULT_CONFIRMED";
  title: string;
  body: string;
  gameId: string;
  push: { ru: [string, string]; tm: [string, string] };
};

/** Every captain of the team — see the note in matches.ts. */
async function notifyCaptains(teamId: string, notice: MatchNotice): Promise<void> {
  const captains = await prisma.teamMember.findMany({
    where: { teamId, isCaptain: true },
    select: { user: { select: { id: true, fcmToken: true, locale: true } } },
  });
  if (captains.length === 0) return;

  await prisma.notification.createMany({
    data: captains.map((c) => ({
      userId: c.user.id,
      type: notice.type,
      title: notice.title,
      body: notice.body,
      data: { gameId: notice.gameId },
    })),
  });

  await Promise.all(
    captains
      .filter((c) => c.user.fcmToken)
      .map((c) => {
        const [title, body] = c.user.locale === "tm" ? notice.push.tm : notice.push.ru;
        return sendPush(c.user.fcmToken, title, body, {
          gameId: notice.gameId,
          url: `/${c.user.locale}/games/${notice.gameId}`,
        });
      }),
  );
}
