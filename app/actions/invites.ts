"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/fcm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function invitePlayerToGame(
  gameId: string,
  receiverId: string,
  locale: string,
): Promise<void> {
  const senderId = await requireUserId();
  if (senderId === receiverId) return;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { _count: { select: { participants: true } } },
  });
  if (!game) return;
  if (game.organizerId !== senderId) return;
  if (game.status === "CANCELLED" || game.status === "COMPLETED") return;
  if (game._count.participants >= game.totalSpots) return;

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { isOpenToInvite: true, locale: true, fcmToken: true },
  });
  if (!receiver?.isOpenToInvite) return;

  const ru = receiver.locale !== "tm";
  const title = ru ? "Приглашение в игру" : "Oýna çakylyk";
  const body = ru
    ? "Вас пригласили в открытую игру."
    : "Sizi açyk oýna çagyrýarlar.";

  await prisma.$transaction(async (tx) => {
    await tx.gameInvite.upsert({
      where: { gameId_receiverId: { gameId, receiverId } },
      create: { gameId, senderId, receiverId },
      update: {},
    });
    await tx.notification.create({
      data: {
        userId: receiverId,
        type: "GAME_INVITE",
        title,
        body,
        data: { gameId },
      },
    });
  });

  await sendPush(receiver.fcmToken, title, body, {
    gameId,
    url: `/${receiver.locale}/games/${gameId}`,
  });

  revalidatePath(`/${locale}/players/${receiverId}`);
  redirect(`/${locale}/games/${gameId}`);
}
