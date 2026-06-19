"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Position } from "@prisma/client";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `+993${digits}`;
  if (digits.startsWith("993")) return `+${digits}`;
  return `+${digits}`;
}

export async function saveName(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ru");
  if (!name) return;
  await prisma.user.update({ where: { id: userId }, data: { name } });
  redirect(`/${locale}/onboarding/phone`);
}

export async function savePhone(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const raw = String(formData.get("phone") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ru");
  if (raw.replace(/\D/g, "").length < 8) return;
  const phone = normalizePhone(raw);
  await prisma.user.update({ where: { id: userId }, data: { phone } });
  redirect(`/${locale}/onboarding/position`);
}

export async function savePosition(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const position = String(formData.get("position") ?? "") as Position;
  const locale = String(formData.get("locale") ?? "ru");
  const valid: Position[] = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];
  if (!valid.includes(position)) return;
  await prisma.user.update({ where: { id: userId }, data: { position } });
  redirect(`/${locale}/onboarding/district`);
}

export async function saveDistrict(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const district = String(formData.get("district") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ru");
  if (!district) return;
  await prisma.user.update({ where: { id: userId }, data: { district } });
  redirect(`/${locale}/onboarding/age`);
}

export async function saveAge(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const ageStr = String(formData.get("age") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ru");
  const age = ageStr ? parseInt(ageStr, 10) : null;
  await prisma.user.update({
    where: { id: userId },
    data: { age, locale },
  });
  redirect(`/${locale}/games`);
}

export async function skipAge(locale: string) {
  await requireUserId();
  redirect(`/${locale}/games`);
}
