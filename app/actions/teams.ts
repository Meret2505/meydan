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

export async function createTeam(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");
  const name = String(formData.get("name") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim() || null;

  if (name.length < 2) return;

  const team = await prisma.team.create({
    data: {
      name,
      district,
      members: { create: { userId, isCaptain: true } },
    },
  });

  revalidatePath(`/${locale}/teams`);
  redirect(`/${locale}/teams/${team.id}`);
}

export async function joinTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });
  revalidatePath(`/${locale}/teams/${teamId}`);
  revalidatePath(`/${locale}/teams`);
}

export async function leaveTeam(teamId: string, locale: string): Promise<void> {
  const userId = await requireUserId();
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) return;
  if (member.isCaptain) return;
  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });
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
