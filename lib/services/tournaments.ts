import { prisma } from "@/lib/prisma";

/**
 * Tournament registration and result recording, extracted from
 * app/actions/tournaments.ts so the web actions and the mobile API share one
 * implementation.
 *
 * Two authorities matter here and are enforced server-side: only a team's
 * captain may enter or withdraw that team, and only the tournament's creator
 * may record results. Without the second check any authenticated user could
 * post fabricated scores into any tournament.
 */

export type RegisterError =
  | "tournament_not_found"
  | "team_not_found"
  | "not_captain"
  | "tournament_cancelled";

export type RegisterResult =
  | { ok: true; alreadyRegistered: boolean }
  | { ok: false; error: RegisterError };

async function assertCaptain(teamId: string, userId: string): Promise<boolean> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { isCaptain: true },
  });
  return member?.isCaptain === true;
}

/** Enters a team into a tournament. Idempotent — re-entering is a no-op. */
export async function registerTeam(
  tournamentId: string,
  teamId: string,
  userId: string,
): Promise<RegisterResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, cancelled: true },
  });
  if (!tournament) return { ok: false, error: "tournament_not_found" };
  if (tournament.cancelled) return { ok: false, error: "tournament_cancelled" };

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) return { ok: false, error: "team_not_found" };

  if (!(await assertCaptain(teamId, userId))) {
    return { ok: false, error: "not_captain" };
  }

  const existing = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    select: { id: true },
  });

  await prisma.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId },
    update: {},
  });

  return { ok: true, alreadyRegistered: !!existing };
}

export type UnregisterResult =
  | { ok: true }
  | { ok: false; error: "tournament_not_found" | "not_captain" | "not_registered" };

/** Withdraws a team from a tournament. Captain only. */
export async function unregisterTeam(
  tournamentId: string,
  teamId: string,
  userId: string,
): Promise<UnregisterResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true },
  });
  if (!tournament) return { ok: false, error: "tournament_not_found" };

  if (!(await assertCaptain(teamId, userId))) {
    return { ok: false, error: "not_captain" };
  }

  const removed = await prisma.tournamentTeam.deleteMany({
    where: { tournamentId, teamId },
  });
  if (removed.count === 0) return { ok: false, error: "not_registered" };

  return { ok: true };
}

export type MatchResultInput = {
  homeTeamId: string;
  awayTeamId: string;
  scoreHome: number;
  scoreAway: number;
  round?: string | null;
};

export type RecordMatchError =
  | "invalid_input"
  | "tournament_not_found"
  | "not_creator"
  | "tournament_cancelled"
  | "teams_not_registered";

export type RecordMatchResult =
  | { ok: true; matchId: string; alreadyRecorded: boolean }
  | { ok: false; error: RecordMatchError };

/** Scores above this are a fat-finger or an attack, not a football result. */
const MAX_SCORE = 999;

/**
 * Records a played match.
 *
 * Idempotent against double-submit: re-posting an identical result (same
 * fixture, same round, same scores) returns the existing match instead of
 * inserting a second row. Previously a double tap silently created duplicate
 * matches, which then double-counted in the standings. A *different* score for
 * the same fixture still creates a new row — that is a genuine second leg or a
 * correction, and collapsing those would lose data.
 */
export async function recordMatchResult(
  tournamentId: string,
  userId: string,
  input: MatchResultInput,
): Promise<RecordMatchResult> {
  const { homeTeamId, awayTeamId, scoreHome, scoreAway } = input;
  const round = input.round?.trim() || null;

  // parseInt("abc") is NaN and every NaN comparison is false, so the integer
  // check has to be explicit rather than relying on the range bounds.
  if (
    !homeTeamId ||
    !awayTeamId ||
    homeTeamId === awayTeamId ||
    !Number.isInteger(scoreHome) ||
    !Number.isInteger(scoreAway) ||
    scoreHome < 0 ||
    scoreAway < 0 ||
    scoreHome > MAX_SCORE ||
    scoreAway > MAX_SCORE
  ) {
    return { ok: false, error: "invalid_input" };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true, cancelled: true },
  });
  if (!tournament) return { ok: false, error: "tournament_not_found" };
  if (tournament.cancelled) return { ok: false, error: "tournament_cancelled" };
  if (tournament.creatorId !== userId) return { ok: false, error: "not_creator" };

  const registered = await prisma.tournamentTeam.findMany({
    where: { tournamentId, teamId: { in: [homeTeamId, awayTeamId] } },
    select: { teamId: true },
  });
  if (registered.length !== 2) return { ok: false, error: "teams_not_registered" };

  const duplicate = await prisma.tournamentMatch.findFirst({
    where: { tournamentId, homeTeamId, awayTeamId, round, scoreHome, scoreAway },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: true, matchId: duplicate.id, alreadyRecorded: true };
  }

  const match = await prisma.tournamentMatch.create({
    data: {
      tournamentId,
      homeTeamId,
      awayTeamId,
      scoreHome,
      scoreAway,
      round,
      scheduledAt: new Date(),
    },
  });

  return { ok: true, matchId: match.id, alreadyRecorded: false };
}
