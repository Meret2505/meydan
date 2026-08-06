"use server";

import { auth } from "@/lib/auth";
import {
  createTeam as createTeamService,
  disbandTeam as disbandTeamService,
  joinTeam as joinTeamService,
  leaveTeam as leaveTeamService,
  removeMember as removeMemberService,
} from "@/lib/services/teams";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * Create/join/leave delegate to lib/services/teams.ts so the mobile API runs
 * the same logic. A failed attempt (too-short name, captain leaving) still
 * resolves silently here and simply re-renders, as it always has.
 */
export async function createTeam(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");

  const result = await createTeamService(userId, {
    name: String(formData.get("name") ?? ""),
    district: String(formData.get("district") ?? ""),
    color: String(formData.get("color") ?? ""),
  });
  if (!result.ok) return;

  revalidatePath(`/${locale}/teams`);
  redirect(`/${locale}/teams/${result.teamId}`);
}

export async function joinTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  await joinTeamService(teamId, userId);

  revalidatePath(`/${locale}/teams/${teamId}`);
  revalidatePath(`/${locale}/teams`);
}

export async function leaveTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  await leaveTeamService(teamId, userId);

  revalidatePath(`/${locale}/teams/${teamId}`);
  revalidatePath(`/${locale}/teams`);
}

export async function removeMember(
  teamId: string,
  memberUserId: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  await removeMemberService(teamId, userId, memberUserId);

  revalidatePath(`/${locale}/teams/${teamId}`);
}

export async function disbandTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  const result = await disbandTeamService(teamId, userId);
  // A refused disband (not captain, or the team still has games) resolves
  // silently and re-renders, as it always has.
  if (!result.ok) return;

  revalidatePath(`/${locale}/teams`);
  redirect(`/${locale}/teams`);
}
