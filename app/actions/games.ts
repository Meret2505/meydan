"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/fcm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Position } from "@prisma/client";

const ALL_POSITIONS: Position[] = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createGame(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");

  const scheduledRaw = String(formData.get("scheduledAt") ?? "");
  const fieldId = String(formData.get("fieldId") ?? "") || null;
  const fieldName = String(formData.get("fieldName") ?? "").trim() || null;
  const totalSpots = parseInt(String(formData.get("totalSpots") ?? "0"), 10);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const positions = formData
    .getAll("neededPositions")
    .map(String)
    .filter((p): p is Position => ALL_POSITIONS.includes(p as Position));

  if (!scheduledRaw || (!fieldId && !fieldName) || totalSpots < 2) return;

  const scheduledAt = new Date(scheduledRaw);
  if (Number.isNaN(scheduledAt.getTime())) return;

  const game = await prisma.game.create({
    data: {
      scheduledAt,
      fieldId,
      fieldName: fieldId ? null : fieldName,
      totalSpots,
      neededPositions: positions,
      notes,
      organizerId: userId,
      participants: { create: { userId } },
    },
  });

  revalidatePath(`/${locale}/games`);
  redirect(`/${locale}/games/${game.id}`);
}

export async function joinGame(gameId: string, locale: string): Promise<void> {
  const userId = await requireUserId();

  const organizerId = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { _count: { select: { participants: true } } },
    });
    if (!game) return null;
    if (game.status !== "OPEN" && game.status !== "FULL") return null;
    if (game._count.participants >= game.totalSpots) return null;

    await tx.gameParticipant.upsert({
      where: { gameId_userId: { gameId, userId } },
      create: { gameId, userId },
      update: {},
    });

    const newCount = game._count.participants + 1;
    if (newCount >= game.totalSpots) {
      await tx.game.update({ where: { id: gameId }, data: { status: "FULL" } });
    }

    if (game.organizerId !== userId) {
      await tx.notification.create({
        data: {
          userId: game.organizerId,
          type: "PLAYER_JOINED",
          title: "Новый игрок",
          body: "Игрок записался на твою игру.",
          data: { gameId },
        },
      });
      return game.organizerId;
    }
    return null;
  });

  if (organizerId) {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { fcmToken: true, locale: true },
    });
    if (organizer?.fcmToken) {
      const ru = organizer.locale !== "tm";
      await sendPush(
        organizer.fcmToken,
        ru ? "Новый игрок" : "Täze oýunçy",
        ru ? "Игрок записался на твою игру." : "Oýunçy oýnuňa ýazyldy.",
        { gameId, url: `/${organizer.locale}/games/${gameId}` },
      );
    }
  }

  revalidatePath(`/${locale}/games`);
  revalidatePath(`/${locale}/games/${gameId}`);
}

export async function leaveGame(gameId: string, locale: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) return;
    if (game.organizerId === userId) return;

    await tx.gameParticipant.deleteMany({ where: { gameId, userId } });

    if (game.status === "FULL") {
      await tx.game.update({ where: { id: gameId }, data: { status: "OPEN" } });
    }
  });

  revalidatePath(`/${locale}/games`);
  revalidatePath(`/${locale}/games/${gameId}`);
}

export async function cancelGame(gameId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      participants: {
        where: { userId: { not: userId } },
        include: { user: { select: { fcmToken: true, locale: true } } },
      },
    },
  });
  if (!game || game.organizerId !== userId) return;

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: { status: "CANCELLED" },
    }),
    prisma.notification.createMany({
      data: game.participants.map((p) => ({
        userId: p.userId,
        type: "GAME_CANCELLED" as const,
        title: "Игра отменена",
        body: "Организатор отменил игру.",
        data: { gameId },
      })),
    }),
  ]);

  for (const p of game.participants) {
    if (!p.user.fcmToken) continue;
    const ru = p.user.locale !== "tm";
    await sendPush(
      p.user.fcmToken,
      ru ? "Игра отменена" : "Oýun ýatyryldy",
      ru ? "Организатор отменил игру." : "Guramaçy oýny ýatyrdy.",
      { gameId, url: `/${p.user.locale}/games/${gameId}` },
    );
  }

  revalidatePath(`/${locale}/games`);
  redirect(`/${locale}/games`);
}

export async function saveResult(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const gameId = String(formData.get("gameId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  const scoreHome = parseInt(String(formData.get("scoreHome") ?? "0"), 10);
  const scoreAway = parseInt(String(formData.get("scoreAway") ?? "0"), 10);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { participants: true },
  });
  if (!game || game.organizerId !== userId) return;

  const updates = game.participants.map((p) => {
    const attended = formData.get(`attended_${p.userId}`) === "on";
    return prisma.gameParticipant.update({
      where: { id: p.id },
      data: { attended },
    });
  });

  await prisma.$transaction([
    ...updates,
    prisma.game.update({
      where: { id: gameId },
      data: { scoreHome, scoreAway, status: "COMPLETED" },
    }),
  ]);

  revalidatePath(`/${locale}/games`);
  revalidatePath(`/${locale}/games/${gameId}`);
  redirect(`/${locale}/games?tab=mine`);
}
