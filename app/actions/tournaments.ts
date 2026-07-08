"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createTournament(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const name = String(formData.get("name") ?? "").trim();
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (name.length < 2 || !startRaw) return;
  const startDate = new Date(startRaw);
  if (Number.isNaN(startDate.getTime())) return;
  const endDate = endRaw ? new Date(endRaw) : null;
  if (endDate && Number.isNaN(endDate.getTime())) return;

  const t = await prisma.tournament.create({
    data: { name, startDate, endDate, description, creatorId: userId },
  });
  revalidatePath(`/${locale}/tournaments`);
  redirect(`/${locale}/tournaments/${t.id}`);
}

export async function registerTeamForTournament(
  tournamentId: string,
  teamId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  const captain = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!captain?.isCaptain) return;

  await prisma.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId },
    update: {},
  });
  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}

export async function unregisterTeamFromTournament(
  tournamentId: string,
  teamId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  const captain = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!captain?.isCaptain) return;

  await prisma.tournamentTeam.deleteMany({
    where: { tournamentId, teamId },
  });
  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}

export async function recordMatchResult(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  const scoreHome = parseInt(String(formData.get("scoreHome") ?? "-1"), 10);
  const scoreAway = parseInt(String(formData.get("scoreAway") ?? "-1"), 10);
  const round = String(formData.get("round") ?? "").trim() || null;

  // Reject non-numeric / out-of-range scores (parseInt("abc") -> NaN, and NaN
  // comparisons are always false, so guard explicitly). Cap keeps a single
  // fat-fingered or malicious entry from storing absurd standings.
  if (
    !homeTeamId ||
    !awayTeamId ||
    homeTeamId === awayTeamId ||
    !Number.isInteger(scoreHome) ||
    !Number.isInteger(scoreAway) ||
    scoreHome < 0 ||
    scoreAway < 0 ||
    scoreHome > 999 ||
    scoreAway > 999
  )
    return;

  // Only the tournament creator may record results. Without this check any
  // authenticated user could POST fabricated scores into any tournament.
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true, cancelled: true },
  });
  if (!tournament || tournament.cancelled || tournament.creatorId !== userId)
    return;

  const reg = await prisma.tournamentTeam.findMany({
    where: { tournamentId, teamId: { in: [homeTeamId, awayTeamId] } },
  });
  if (reg.length !== 2) return;

  await prisma.tournamentMatch.create({
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
  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
  redirect(`/${locale}/tournaments/${tournamentId}`);
}

export async function cancelTournament(
  tournamentId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  });
  if (!t || t.creatorId !== userId) return;
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { cancelled: true },
  });
  revalidatePath(`/${locale}/tournaments`);
  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}
