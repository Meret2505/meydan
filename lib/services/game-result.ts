import { prisma } from "@/lib/prisma";

/**
 * Writing up a game that has been played: who turned up, and optionally the
 * score.
 *
 * Extracted so the web form and the mobile API share one implementation —
 * before this the only way to record anything was a web server action, and the
 * feeds stopped showing a game the moment it kicked off, so in practice
 * nothing was ever recorded. Attendance is the half that matters: it is what
 * `getPlayerStats` counts, which is what the reliability rating on every game
 * card is built from.
 *
 * Deliberately optional. A game nobody wrote up stays COMPLETED with a null
 * score, and the organizer is nudged once (see game-lifecycle) rather than
 * nagged.
 */

const MAX_SCORE = 99;

export type RecordResultInput = {
  scoreHome?: number | null;
  scoreAway?: number | null;
  /** userId → turned up. Players left out keep whatever they had. */
  attended?: Record<string, boolean>;
};

export type NormalizedResult = {
  scoreHome: number | null;
  scoreAway: number | null;
  attended: Record<string, boolean>;
};

/**
 * Validates a submission, or null when there is nothing usable in it.
 *
 * Half a score is not a result, and a submission with neither a score nor any
 * attendance is not worth a write.
 */
export function normalizeResultInput(input: RecordResultInput): NormalizedResult | null {
  const attended = input.attended ?? {};
  const home = input.scoreHome ?? null;
  const away = input.scoreAway ?? null;

  const hasScore = home !== null || away !== null;
  if (hasScore) {
    if (home === null || away === null) return null;
    for (const value of [home, away]) {
      if (!Number.isInteger(value) || value < 0 || value > MAX_SCORE) return null;
    }
  }

  if (!hasScore && Object.keys(attended).length === 0) return null;

  return { scoreHome: home, scoreAway: away, attended };
}

export type RecordResultError =
  | "not_found"
  | "not_organizer"
  | "game_not_played"
  | "game_over"
  | "invalid_input";

export type RecordResultResult = { ok: true } | { ok: false; error: RecordResultError };

/**
 * Records the result. Only the organizer may, only once the game has kicked
 * off, and never for a cancelled one.
 *
 * Re-recording is allowed: an organizer who ticked the wrong name can fix it,
 * and a score can be added later to a game that was closed with attendance
 * only. Unknown user ids in `attended` are ignored rather than rejected — the
 * roster is read inside the transaction, so a player who left in the meantime
 * simply is not updated.
 */
export async function recordGameResult(
  gameId: string,
  organizerId: string,
  input: RecordResultInput,
): Promise<RecordResultResult> {
  const normalized = normalizeResultInput(input);
  if (!normalized) return { ok: false, error: "invalid_input" };

  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { participants: { select: { id: true, userId: true } } },
    });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.organizerId !== organizerId) {
      return { ok: false as const, error: "not_organizer" as const };
    }
    if (game.status === "CANCELLED") return { ok: false as const, error: "game_over" as const };
    if (game.scheduledAt.getTime() > Date.now()) {
      return { ok: false as const, error: "game_not_played" as const };
    }

    for (const participant of game.participants) {
      const attended = normalized.attended[participant.userId];
      if (attended === undefined) continue;
      await tx.gameParticipant.update({
        where: { id: participant.id },
        data: { attended },
      });
    }

    await tx.game.update({
      where: { id: gameId },
      data: {
        status: "COMPLETED",
        // Left alone when the organizer only marked attendance, so adding a
        // score later does not wipe the ticks and vice versa.
        ...(normalized.scoreHome !== null
          ? { scoreHome: normalized.scoreHome, scoreAway: normalized.scoreAway }
          : {}),
      },
    });

    return { ok: true as const };
  });
}
