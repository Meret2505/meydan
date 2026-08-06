"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTeam as createTeamService,
  joinTeam as joinTeamService,
  leaveTeam as leaveTeamService,
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
  const captain = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!captain?.isCaptain) return;
  if (memberUserId === userId) return;

  await prisma.teamMember.deleteMany({
    where: { teamId, userId: memberUserId },
  });
  revalidatePath(`/${locale}/teams/${teamId}`);
}

export async function disbandTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  const captain = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!captain?.isCaptain) return;

  const refs = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      _count: { select: { games: true, homeMatches: true, awayMatches: true } },
    },
  });
  const total =
    (refs?._count.games ?? 0) +
    (refs?._count.homeMatches ?? 0) +
    (refs?._count.awayMatches ?? 0);
  if (total > 0) return;

  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { teamId } }),
    prisma.team.delete({ where: { id: teamId } }),
  ]);
  revalidatePath(`/${locale}/teams`);
  redirect(`/${locale}/teams`);
}
