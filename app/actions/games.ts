"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseScore } from "@/lib/validate";
import { sendPush } from "@/lib/fcm";
import {
  createGame as createGameService,
  joinGame as joinGameService,
  leaveGame as leaveGameService,
} from "@/lib/services/games";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createGame(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");

  const priceRaw = String(formData.get("pricePerPlayer") ?? "").trim();
  const result = await createGameService(userId, {
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    fieldId: String(formData.get("fieldId") ?? "") || null,
    fieldName: String(formData.get("fieldName") ?? ""),
    totalSpots: parseInt(String(formData.get("totalSpots") ?? "0"), 10),
    pricePerPlayer: priceRaw ? parseInt(priceRaw, 10) : null,
    notes: String(formData.get("notes") ?? ""),
    neededPositions: formData.getAll("neededPositions").map(String),
  });
  // Preserve the original behaviour: invalid input silently re-renders.
  if (!result.ok) return;

  revalidatePath(`/${locale}/games`);
  redirect(`/${locale}/games/${result.gameId}`);
}

/**
 * Join/leave delegate to lib/services/games.ts so the mobile API runs the same
 * transaction. A failed attempt (full, cancelled, organizer leaving) still
 * resolves silently here and simply re-renders, as it always has — surfacing
 * the reason would mean changing the client components, which is out of scope.
 */
export async function joinGame(gameId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  await joinGameService(gameId, userId);

  revalidatePath(`/${locale}/games`);
  revalidatePath(`/${locale}/games/${gameId}`);
}

export async function leaveGame(gameId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  await leaveGameService(gameId, userId);

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
  const scoreHome = parseScore(String(formData.get("scoreHome") ?? ""));
  const scoreAway = parseScore(String(formData.get("scoreAway") ?? ""));
  if (scoreHome === null || scoreAway === null) return;

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
