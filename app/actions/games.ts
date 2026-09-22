"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordGameResult } from "@/lib/services/game-result";
import { parseScore } from "@/lib/validate";
import {
  cancelGame as cancelGameService,
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
  const result = await cancelGameService(gameId, userId);
  // A failed attempt (not found, not the organizer, already finished) resolves
  // silently and simply re-renders, as it always has.
  if (!result.ok) return;

  revalidatePath(`/${locale}/games`);
  redirect(`/${locale}/games`);
}

export async function saveResult(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const gameId = String(formData.get("gameId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  // Checkbox semantics: an unchecked box is simply absent from the submission,
  // so the roster is read here to turn "absent" into an explicit false —
  // exactly what this action did inline before it moved to the shared service.
  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
    select: { userId: true },
  });
  const attended = Object.fromEntries(
    participants.map((p) => [p.userId, formData.get(`attended_${p.userId}`) === "on"]),
  );

  const result = await recordGameResult(gameId, userId, {
    scoreHome: parseScore(String(formData.get("scoreHome") ?? "")),
    scoreAway: parseScore(String(formData.get("scoreAway") ?? "")),
    attended,
  });
  // A failed attempt (not the organizer, not played yet, cancelled) resolves
  // silently and re-renders, as the other actions in this file do.
  if (!result.ok) return;

  revalidatePath(`/${locale}/games`);
  revalidatePath(`/${locale}/games/${gameId}`);
  redirect(`/${locale}/games?tab=mine`);
}

