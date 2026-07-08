"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Toggles the current user's favorite state for a field.
 * No-op (silently succeeds) if the caller isn't signed in — the UI already
 * gates the star button behind the (main) layout's auth redirect.
 */
export async function toggleFieldFavorite(fieldId: string, locale: string) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return;
  const key = { userId_fieldId: { userId, fieldId } };
  const existing = await prisma.fieldFavorite.findUnique({ where: key });
  if (existing) {
    await prisma.fieldFavorite.delete({ where: key });
  } else {
    await prisma.fieldFavorite.create({ data: { userId, fieldId } });
  }
  revalidatePath(`/${locale}/fields`);
  revalidatePath(`/${locale}/fields/${fieldId}`);
}
