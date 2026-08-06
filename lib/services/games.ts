import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/fcm";

/**
 * Game membership operations, extracted from app/actions/games.ts so the web
 * actions and the mobile API share one implementation.
 *
 * The transactional invariants here are the ones most worth preserving:
 * capacity is re-read inside the transaction, the OPEN/FULL transition is
 * derived from the real participant count, and the in-app notification is
 * committed before any push is attempted.
 */

import type { Position } from "@prisma/client";

const ALL_POSITIONS: Position[] = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];

export type CreateGameInput = {
  scheduledAt: string;
  fieldId?: string | null;
  fieldName?: string | null;
  totalSpots: number;
  pricePerPlayer?: number | null;
  notes?: string | null;
  neededPositions: string[];
};

export type CreateGameResult =
  | { ok: true; gameId: string }
  | { ok: false; error: "invalid_input" };

/**
 * Creates a game with the organizer auto-joined, shared by the web create
 * action and the mobile POST /games. Validation mirrors the original action:
 * a time, a field (picked or free-text), and at least 2 spots are required;
 * anything else is rejected rather than silently coerced.
 */
export async function createGame(
  userId: string,
  input: CreateGameInput,
): Promise<CreateGameResult> {
  const fieldId = input.fieldId?.trim() || null;
  const fieldName = input.fieldName?.trim() || null;
  const notes = input.notes?.trim() || null;
  const pricePerPlayer =
    input.pricePerPlayer != null && input.pricePerPlayer >= 0
      ? Math.trunc(input.pricePerPlayer)
      : null;
  const positions = input.neededPositions.filter((p): p is Position =>
    ALL_POSITIONS.includes(p as Position),
  );

  if (!input.scheduledAt || (!fieldId && !fieldName) || input.totalSpots < 2) {
    return { ok: false, error: "invalid_input" };
  }
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "invalid_input" };

  const game = await prisma.game.create({
    data: {
      scheduledAt,
      fieldId,
      // A picked field owns the name; free-text only when no field is chosen.
      fieldName: fieldId ? null : fieldName,
      totalSpots: input.totalSpots,
      pricePerPlayer,
      neededPositions: positions,
      notes,
      organizerId: userId,
      participants: { create: { userId } },
    },
  });
  return { ok: true, gameId: game.id };
}

export type JoinError = "not_found" | "not_joinable" | "game_full";

export type JoinResult =
  | { ok: true; alreadyJoined: boolean }
  | { ok: false; error: JoinError };

export type LeaveError = "not_found" | "organizer_cannot_leave" | "game_over";

export type LeaveResult = { ok: true } | { ok: false; error: LeaveError };

export type CancelError = "not_found" | "not_organizer" | "game_over";

export type CancelResult =
  | { ok: true; alreadyCancelled: boolean }
  | { ok: false; error: CancelError };

/**
 * Adds the user to a game.
 *
 * Idempotent: joining twice succeeds and reports `alreadyJoined`, rather than
 * erroring, so a retried request after a dropped response does the right thing.
 */
export async function joinGame(gameId: string, userId: string): Promise<JoinResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    // Lock the game row for the duration of the transaction.
    //
    // Without this the capacity check is unsafe: under Postgres' default READ
    // COMMITTED isolation, two different users joining a 5-of-6 game both read
    // 5, both pass the check, and both insert — leaving 7 players with 6
    // spots. The lock makes concurrent joins for the same game serialize, so
    // the second one sees the first one's row.
    //
    // Locking by game id also means joins to *different* games never contend.
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false as const, error: "not_found" as const };

    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { _count: { select: { participants: true } } },
    });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.status !== "OPEN" && game.status !== "FULL") {
      return { ok: false as const, error: "not_joinable" as const };
    }

    const already = await tx.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
      select: { id: true },
    });

    // Only a *new* joiner is subject to the capacity check; someone already in
    // the game is not taking another spot.
    if (!already && game._count.participants >= game.totalSpots) {
      return { ok: false as const, error: "game_full" as const };
    }

    await tx.gameParticipant.upsert({
      where: { gameId_userId: { gameId, userId } },
      create: { gameId, userId },
      update: {},
    });

    // Re-count rather than assuming the upsert inserted a row. The previous
    // implementation used `_count + 1` unconditionally, so an existing
    // participant re-joining a 5-of-6 game flipped it to FULL and locked out
    // the last real spot.
    const filled = await tx.gameParticipant.count({ where: { gameId } });
    if (filled >= game.totalSpots && game.status !== "FULL") {
      await tx.game.update({ where: { id: gameId }, data: { status: "FULL" } });
    }

    // Notify the organizer, unless they are the one joining their own game.
    // Committed inside the transaction so the in-app notification can never be
    // lost, independently of whether the push below succeeds.
    if (!already && game.organizerId !== userId) {
      await tx.notification.create({
        data: {
          userId: game.organizerId,
          type: "PLAYER_JOINED",
          title: "Новый игрок",
          body: "Игрок записался на твою игру.",
          data: { gameId },
        },
      });
      return {
        ok: true as const,
        alreadyJoined: false,
        notifyOrganizerId: game.organizerId,
      };
    }

    return { ok: true as const, alreadyJoined: !!already, notifyOrganizerId: null };
  });

  if (!outcome.ok) return outcome;

  if (outcome.notifyOrganizerId) {
    await pushToOrganizer(outcome.notifyOrganizerId, gameId);
  }
  return { ok: true, alreadyJoined: outcome.alreadyJoined };
}

/**
 * Best-effort push to the organizer. Runs after the transaction commits: the
 * database is the source of truth for notifications, and a Firebase outage
 * must never roll back a successful join.
 */
async function pushToOrganizer(organizerId: string, gameId: string): Promise<void> {
  const organizer = await prisma.user.findUnique({
    where: { id: organizerId },
    select: { fcmToken: true, locale: true },
  });
  if (!organizer?.fcmToken) return;

  const ru = organizer.locale !== "tm";
  await sendPush(
    organizer.fcmToken,
    ru ? "Новый игрок" : "Täze oýunçy",
    ru ? "Игрок записался на твою игру." : "Oýunçy oýnuňa ýazyldy.",
    { gameId, url: `/${organizer.locale}/games/${gameId}` },
  );
}

/**
 * Removes the user from a game.
 *
 * The organizer cannot leave their own game — there is no hand-off mechanism,
 * so an organizer-less game would be unmanageable.
 */
export async function leaveGame(gameId: string, userId: string): Promise<LeaveResult> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.organizerId === userId) {
      return { ok: false as const, error: "organizer_cannot_leave" as const };
    }
    // Leaving a finished game would delete the participation row and with it
    // the recorded attendance, silently rewriting history. The web UI hides
    // the button in this state; the API has to enforce it.
    if (game.status === "COMPLETED" || game.status === "CANCELLED") {
      return { ok: false as const, error: "game_over" as const };
    }

    await tx.gameParticipant.deleteMany({ where: { gameId, userId } });

    if (game.status === "FULL") {
      await tx.game.update({ where: { id: gameId }, data: { status: "OPEN" } });
    }
    return { ok: true as const };
  });
}

/**
 * Cancels a game. Only the organizer may cancel, and only a game that has not
 * already finished — cancelling a COMPLETED game would rewrite recorded history.
 *
 * Idempotent: cancelling an already-cancelled game succeeds and reports
 * `alreadyCancelled` without notifying anyone a second time.
 */
export async function cancelGame(
  gameId: string,
  userId: string,
): Promise<CancelResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    // Lock the row so two concurrent cancels cannot both pass the status check
    // and each create a full set of "game cancelled" notifications.
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false as const, error: "not_found" as const };

    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return { ok: false as const, error: "not_found" as const };
    if (game.organizerId !== userId) {
      return { ok: false as const, error: "not_organizer" as const };
    }
    if (game.status === "COMPLETED") {
      return { ok: false as const, error: "game_over" as const };
    }
    if (game.status === "CANCELLED") {
      return { ok: true as const, alreadyCancelled: true, notify: [] };
    }

    // Everyone except the organizer gets told; the organizer is the one acting.
    const participants = await tx.gameParticipant.findMany({
      where: { gameId, userId: { not: userId } },
      select: { userId: true },
    });

    await tx.game.update({ where: { id: gameId }, data: { status: "CANCELLED" } });

    // Committed with the status change so the in-app notification can never be
    // lost, independently of whether the pushes below succeed.
    await tx.notification.createMany({
      data: participants.map((p) => ({
        userId: p.userId,
        type: "GAME_CANCELLED" as const,
        title: "Игра отменена",
        body: "Организатор отменил игру.",
        data: { gameId },
      })),
    });

    return {
      ok: true as const,
      alreadyCancelled: false,
      notify: participants.map((p) => p.userId),
    };
  });

  if (!outcome.ok) return outcome;

  await pushCancelled(outcome.notify, gameId);
  return { ok: true, alreadyCancelled: outcome.alreadyCancelled };
}

/**
 * Best-effort pushes to the cancelled game's players. Runs after the
 * transaction commits — a Firebase outage must never roll back the cancel.
 */
async function pushCancelled(userIds: string[], gameId: string): Promise<void> {
  if (userIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, fcmToken: { not: null } },
    select: { fcmToken: true, locale: true },
  });

  for (const user of users) {
    if (!user.fcmToken) continue;
    const ru = user.locale !== "tm";
    await sendPush(
      user.fcmToken,
      ru ? "Игра отменена" : "Oýun ýatyryldy",
      ru ? "Организатор отменил игру." : "Guramaçy oýny ýatyrdy.",
      { gameId, url: `/${user.locale}/games/${gameId}` },
    );
  }
}
