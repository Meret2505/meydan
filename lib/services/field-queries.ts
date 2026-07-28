import { prisma } from "@/lib/prisma";

/**
 * Field reads shared by the mobile fields endpoints. Kept framework-agnostic
 * (no next/headers) like the other service modules so it runs from a route
 * handler or a test.
 */

/** Active fields plus the viewer's favorite ids, for the list endpoint. */
export async function fetchFields(userId: string) {
  const [fields, favorites] = await Promise.all([
    prisma.field.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.fieldFavorite.findMany({
      where: { userId },
      select: { fieldId: true },
    }),
  ]);
  return {
    fields,
    favoriteIds: new Set(favorites.map((f) => f.fieldId)),
  };
}

/**
 * Adds or removes a favorite. Idempotent on both sides: favoriting twice is a
 * no-op (upsert), unfavoriting a field that was never favorited is a no-op
 * (deleteMany), so the client can retry safely.
 */
export async function setFieldFavorite(
  userId: string,
  fieldId: string,
  favorite: boolean,
): Promise<{ ok: boolean; error?: "field_not_found" }> {
  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { id: true },
  });
  if (!field) return { ok: false, error: "field_not_found" };

  if (favorite) {
    await prisma.fieldFavorite.upsert({
      where: { userId_fieldId: { userId, fieldId } },
      create: { userId, fieldId },
      update: {},
    });
  } else {
    await prisma.fieldFavorite.deleteMany({ where: { userId, fieldId } });
  }
  return { ok: true };
}
