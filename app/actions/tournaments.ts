"use server";

import { auth } from "@/lib/auth";
import {
  cancelTournament as cancelTournamentService,
  createTournament as createTournamentService,
  recordMatchResult as recordMatchResultService,
  registerTeam as registerTeamService,
  unregisterTeam as unregisterTeamService,
} from "@/lib/services/tournaments";
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

  const result = await createTournamentService(userId, {
    name: String(formData.get("name") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? "") || null,
    description: String(formData.get("description") ?? ""),
  });
  if (!result.ok) return;

  revalidatePath(`/${locale}/tournaments`);
  redirect(`/${locale}/tournaments/${result.tournamentId}`);
}

export async function registerTeamForTournament(
  tournamentId: string,
  teamId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  await registerTeamService(tournamentId, teamId, userId);

  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}

export async function unregisterTeamFromTournament(
  tournamentId: string,
  teamId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  await unregisterTeamService(tournamentId, teamId, userId);

  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}

export async function recordMatchResult(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  const result = await recordMatchResultService(tournamentId, userId, {
    homeTeamId: String(formData.get("homeTeamId") ?? ""),
    awayTeamId: String(formData.get("awayTeamId") ?? ""),
    scoreHome: parseInt(String(formData.get("scoreHome") ?? "-1"), 10),
    scoreAway: parseInt(String(formData.get("scoreAway") ?? "-1"), 10),
    round: String(formData.get("round") ?? ""),
  });
  // A rejected result (bad scores, not the creator, teams not registered)
  // resolves silently and re-renders, as it always has.
  if (!result.ok) return;

  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
  redirect(`/${locale}/tournaments/${tournamentId}`);
}

export async function cancelTournament(
  tournamentId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  await cancelTournamentService(tournamentId, userId);

  revalidatePath(`/${locale}/tournaments`);
  revalidatePath(`/${locale}/tournaments/${tournamentId}`);
}
