"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Position, SkillLevel } from "@prisma/client";

const POSITIONS: Position[] = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];
const SKILLS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const locale = String(formData.get("locale") ?? "ru");

  const name = String(formData.get("name") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "");
  const skillRaw = String(formData.get("skillLevel") ?? "");
  const ageStr = String(formData.get("age") ?? "").trim();
  const isOpenToInvite = formData.get("isOpenToInvite") === "on";

  if (!name) return;
  const position = POSITIONS.includes(positionRaw as Position)
    ? (positionRaw as Position)
    : null;
  const skillLevel = SKILLS.includes(skillRaw as SkillLevel)
    ? (skillRaw as SkillLevel)
    : "BEGINNER";
  const age = ageStr ? parseInt(ageStr, 10) : null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      district: district || null,
      position,
      skillLevel,
      age,
      isOpenToInvite,
    },
  });

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
}

export async function logOut(locale: string) {
  await signOut({ redirect: false });
  redirect(`/${locale}/login`);
}
