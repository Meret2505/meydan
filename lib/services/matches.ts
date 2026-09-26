import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/fcm";
import { canArrangeMatch, isCaptainOf } from "@/lib/services/team-authz";
import { matchStateOf } from "@/lib/services/match-state";

/**
 * Matches between two teams.
 *
 * A match is a `Game` row with `type = TEAM_MATCH` and two teams on it, not a
 * separate entity: it belongs in the same feed as everything else someone
 * might turn up to play. What it does *not* share with an ordinary game is the
 * handshake — challenge, accept, decline — and that lives here rather than in
 * games.ts, whose join/leave path refuses matches outright.
 *
 * Two ways in, one shape:
 *
 *   - a **challenge** names the opponent, and waits for their captain;
 *   - an **open call** names nobody, sits in the feed, and belongs to the
 *     first captain who takes it.
 *
 * The state is read back off the row by matchStateOf; nothing here writes a
 * status column of its own.
 */

/**
 * Clock skew between a phone and the server, borrowed from createGame's
 * reasoning: a match arranged for "now" must not be refused because the
 * caller's clock is a minute fast.
 */
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/** Players per side. The app's games are 5×5 by default. */
const DEFAULT_FORMAT = 5;
const MIN_FORMAT = 3;
const MAX_FORMAT = 11;

export type CreateMatchInput = {
  homeTeamId: string;
  /** Omit for an open "looking for an opponent" call. */
  opponentTeamId?: string | null;
  scheduledAt: string;
  fieldId?: string | null;
  fieldName?: string | null;
  /** Players per side; 5 unless asked otherwise. */
  format?: number | null;
  notes?: string | null;
};

export type MatchError =
  | "not_found"
  | "not_a_match"
  | "not_captain"
  | "roster_too_small"
  | "invalid_input"
  | "match_in_past"
  | "same_team"
  | "already_answered"
  | "already_taken";

export type CreateMatchResult =
  | { ok: true; gameId: string }
  | { ok: false; error: MatchError };

export type MatchActionResult = { ok: true } | { ok: false; error: MatchError };

export async function createMatch(
  userId: string,
  input: CreateMatchInput,
): Promise<CreateMatchResult> {
  const fieldId = input.fieldId?.trim() || null;
  const fieldName = input.fieldName?.trim() || null;
  const notes = input.notes?.trim() || null;
  const opponentTeamId = input.opponentTeamId?.trim() || null;

  if (!input.scheduledAt || (!fieldId && !fieldName)) {
    return { ok: false, error: "invalid_input" };
  }

  const format = Math.trunc(input.format ?? DEFAULT_FORMAT);
  if (!Number.isFinite(format) || format < MIN_FORMAT || format > MAX_FORMAT) {
    return { ok: false, error: "invalid_input" };
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "invalid_input" };
  if (scheduledAt.getTime() < Date.now() - CLOCK_SKEW_TOLERANCE_MS) {
    // Same reasoning as createGame: every feed asks for `scheduledAt >= now`,
    // so a match arranged in the past would be created and then visible to
    // nobody, ever.
    return { ok: false, error: "match_in_past" };
  }

  if (opponentTeamId !== null && opponentTeamId === input.homeTeamId) {
    return { ok: false, error: "same_team" };
  }

  if (!(await isCaptainOf(input.homeTeamId, userId))) {
    return { ok: false, error: "not_captain" };
  }
  if (!(await canArrangeMatch(input.homeTeamId))) {
    return { ok: false, error: "roster_too_small" };
  }

  if (opponentTeamId !== null) {
    const opponent = await prisma.team.findUnique({
      where: { id: opponentTeamId },
      select: { id: true },
    });
    if (!opponent) return { ok: false, error: "not_found" };
    // Checked at challenge time as a courtesy — accept re-checks, because a
    // roster can shrink while the challenge sits unanswered.
    if (!(await canArrangeMatch(opponentTeamId))) {
      return { ok: false, error: "roster_too_small" };
    }
  }

  const game = await prisma.game.create({
    data: {
      type: "TEAM_MATCH",
      scheduledAt,
      fieldId,
      fieldName: fieldId ? null : fieldName,
      // A label, not a capacity. Nobody joins a match individually — the
      // guards in games.ts refuse it — but the column is NOT NULL and
      // lib/game-format.ts derives "5×5" from it, so it carries the format.
      totalSpots: format * 2,
      neededPositions: [],
      notes,
      organizerId: userId,
      teamId: input.homeTeamId,
      awayTeamId: opponentTeamId,
    },
  });

  if (opponentTeamId !== null) {
    await notifyCaptains(opponentTeamId, {
      type: "MATCH_CHALLENGE",
      title: "Вызов на матч",
      body: "Другая команда зовёт вас сыграть.",
      gameId: game.id,
      push: { ru: ["Вызов на матч", "Другая команда зовёт вас сыграть."], tm: ["Oýna çagyryş", "Başga topar sizi oýna çagyrýar."] },
    });
  }

  return { ok: true, gameId: game.id };
}

/**
 * Takes a challenge, or claims an open call.
 *
 * [teamId] is explicit because a captain may run more than one team, and
 * which of them is playing is not something the server should guess.
 */
export async function acceptMatch(
  gameId: string,
  userId: string,
  teamId: string,
): Promise<MatchActionResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    // Lock first. Two captains tapping "accept" on the same open call within
    // the same second would otherwise both read it as free and both write
    // themselves in — the second silently replacing the first. Same shape as
    // joinGame's capacity lock.
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false as const, error: "not_found" as const };

    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.type !== "TEAM_MATCH") return { ok: false as const, error: "not_a_match" as const };

    const state = matchStateOf(game);
    if (state === "pending" && game.awayTeamId !== teamId) {
      // Somebody else's challenge. Not "already taken" — as far as this
      // captain is concerned it does not exist.
      return { ok: false as const, error: "not_found" as const };
    }
    if (state !== "open_call" && state !== "pending") {
      return {
        ok: false as const,
        error: (state === "agreed" ? "already_taken" : "already_answered") as MatchError,
      };
    }
    if (game.teamId === teamId) return { ok: false as const, error: "same_team" as const };
    if (game.scheduledAt.getTime() <= Date.now()) {
      return { ok: false as const, error: "match_in_past" as const };
    }

    if (!(await isCaptainOf(teamId, userId, tx))) {
      return { ok: false as const, error: "not_captain" as const };
    }
    // Re-checked here, not just at challenge time: a roster can drop below the
    // floor while a challenge sits unanswered.
    if (!(await canArrangeMatch(teamId, tx))) {
      return { ok: false as const, error: "roster_too_small" as const };
    }

    await tx.game.update({
      where: { id: gameId },
      data: { awayTeamId: teamId, agreedAt: new Date(), status: "FULL" },
    });

    // The rosters become the line-up. Written now rather than at kickoff so
    // attendance — and with it every player's reliability rating — works
    // exactly as it does for an ordinary game, with no new machinery.
    await writeLineups(tx, gameId, game.teamId, teamId);

    return { ok: true as const, homeTeamId: game.teamId };
  });

  if (!outcome.ok) return outcome;

  if (outcome.homeTeamId) {
    await notifyCaptains(outcome.homeTeamId, {
      type: "MATCH_ACCEPTED",
      title: "Вызов принят",
      body: "Соперник согласился на матч.",
      gameId,
      push: { ru: ["Вызов принят", "Соперник согласился на матч."], tm: ["Çagyryş kabul edildi", "Garşydaş oýna razy boldy."] },
    });
  }
  return { ok: true };
}

export async function declineMatch(
  gameId: string,
  userId: string,
): Promise<MatchActionResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.type !== "TEAM_MATCH") return { ok: false as const, error: "not_a_match" as const };
    if (game.awayTeamId === null) return { ok: false as const, error: "not_found" as const };
    if (matchStateOf(game) !== "pending") {
      return { ok: false as const, error: "already_answered" as const };
    }
    if (!(await isCaptainOf(game.awayTeamId, userId, tx))) {
      return { ok: false as const, error: "not_captain" as const };
    }

    // declinedAt as well as the status: an agreed match the *home* captain
    // later calls off is also CANCELLED, and only this timestamp tells the
    // two apart. See match-state.ts.
    await tx.game.update({
      where: { id: gameId },
      data: { declinedAt: new Date(), status: "CANCELLED" },
    });
    return { ok: true as const, homeTeamId: game.teamId };
  });

  if (!outcome.ok) return outcome;

  if (outcome.homeTeamId) {
    await notifyCaptains(outcome.homeTeamId, {
      type: "MATCH_DECLINED",
      title: "Вызов отклонён",
      body: "Соперник отказался от матча.",
      gameId,
      push: { ru: ["Вызов отклонён", "Соперник отказался от матча."], tm: ["Çagyryş ret edildi", "Garşydaş oýundan ýüz öwürdi."] },
    });
  }
  return { ok: true };
}

/** Calls the match off. The home captain's exit, at any point before kickoff. */
export async function cancelMatch(
  gameId: string,
  userId: string,
): Promise<MatchActionResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false as const, error: "not_found" as const };

    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.type !== "TEAM_MATCH") return { ok: false as const, error: "not_a_match" as const };
    if (game.teamId === null) return { ok: false as const, error: "not_found" as const };

    const state = matchStateOf(game);
    if (state !== "open_call" && state !== "pending" && state !== "agreed") {
      return { ok: false as const, error: "already_answered" as const };
    }
    // Before it is agreed, the challenge belongs to whoever sent it. Once
    // both sides have committed, either may pull out — and the other is the
    // one who needs telling.
    const home = await isCaptainOf(game.teamId, userId, tx);
    const away =
      state === "agreed" &&
      game.awayTeamId !== null &&
      (await isCaptainOf(game.awayTeamId, userId, tx));
    if (!home && !away) return { ok: false as const, error: "not_captain" as const };

    await tx.game.update({ where: { id: gameId }, data: { status: "CANCELLED" } });
    if (state !== "agreed") return { ok: true as const, notify: null };
    // Tell the side that did not press it.
    return { ok: true as const, notify: home ? game.awayTeamId : game.teamId };
  });

  if (!outcome.ok) return outcome;

  // Only an *agreed* match is worth telling the other side about; a pending
  // challenge withdrawn before an answer is nobody else's news.
  if (outcome.notify) {
    await notifyCaptains(outcome.notify, {
      type: "MATCH_DECLINED",
      title: "Матч отменён",
      body: "Соперник отменил матч.",
      gameId,
      push: { ru: ["Матч отменён", "Соперник отменил матч."], tm: ["Oýun ýatyryldy", "Garşydaş oýny ýatyrdy."] },
    });
  }
  return { ok: true };
}

/** Both rosters, recorded as the line-up with the side each played for. */
async function writeLineups(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  gameId: string,
  homeTeamId: string | null,
  awayTeamId: string,
): Promise<void> {
  const teamIds = [homeTeamId, awayTeamId].filter((id): id is string => id !== null);
  const members = await tx.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true, teamId: true },
  });

  // GameParticipant is unique on (gameId, userId), so somebody who plays for
  // both teams gets one row. Home wins the tie; their captain can untick them
  // when the score is written up. Playing for two teams is normal here and
  // refusing the match over it would be worse than picking a side.
  const seen = new Set<string>();
  const rows = members
    .filter((m) => (seen.has(m.userId) ? false : (seen.add(m.userId), true)))
    .map((m) => ({ gameId, userId: m.userId, teamId: m.teamId }));

  if (rows.length > 0) {
    await tx.gameParticipant.createMany({ data: rows, skipDuplicates: true });
  }
}

type MatchNotice = {
  type: "MATCH_CHALLENGE" | "MATCH_ACCEPTED" | "MATCH_DECLINED";
  title: string;
  body: string;
  gameId: string;
  push: { ru: [string, string]; tm: [string, string] };
};

/**
 * Tells a team's captains something about a match.
 *
 * Every captain, not "the" captain: `isCaptain` is a plain boolean with no
 * uniqueness, a team can have several, and there is no way to transfer the
 * role. Writing to all of them is what stops a match freezing because one
 * person stopped opening the app.
 *
 * In-app rows are written first and pushes attempted afterwards, so a
 * Firebase outage loses a notification banner and never the record of what
 * happened — the same split games.ts uses.
 */
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
