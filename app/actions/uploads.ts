"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage, parseObjectUrl } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function extFor(name: string, mime: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function uploadAvatar(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const file = formData.get("file");
  const locale = String(formData.get("locale") ?? "ru");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_BYTES) return;
  if (!ALLOWED_MIME.includes(file.type)) return;

  const ext = extFor(file.name, file.type);
  const path = `${userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl: string;
  try {
    publicUrl = await storage.put("avatars", path, buffer, file.type);
  } catch (e) {
    console.warn("[upload] avatar failed:", (e as Error).message);
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: publicUrl },
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/edit`);
}

export async function removeAvatar(locale: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { avatar: null } });
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/edit`);
}

export async function uploadFieldPhoto(formData: FormData): Promise<void> {
  await requireUserId();
  const fieldId = String(formData.get("fieldId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  const file = formData.get("file");
  if (!fieldId || !(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_BYTES) return;
  if (!ALLOWED_MIME.includes(file.type)) return;

  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { photos: true },
  });
  if (!field) return;
  if (field.photos.length >= 8) return; // soft cap

  const ext = extFor(file.name, file.type);
  const path = `${fieldId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl: string;
  try {
    publicUrl = await storage.put("field-photos", path, buffer, file.type);
  } catch (e) {
    console.warn("[upload] field photo failed:", (e as Error).message);
    return;
  }

  await prisma.field.update({
    where: { id: fieldId },
    data: { photos: { push: publicUrl } },
  });

  revalidatePath(`/${locale}/fields/${fieldId}`);
  revalidatePath(`/${locale}/fields`);
}

export async function removeFieldPhoto(
  fieldId: string,
  photoUrl: string,
  locale: string,
): Promise<void> {
  await requireUserId();
  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { photos: true },
  });
  if (!field) return;
  const next = field.photos.filter((p) => p !== photoUrl);
  if (next.length === field.photos.length) return;

  const parsed = parseObjectUrl(photoUrl);
  if (parsed) {
    try {
      await storage.remove(parsed.bucket, parsed.path);
    } catch {
      /* swallow — DB is the source of truth */
    }
  }

  await prisma.field.update({
    where: { id: fieldId },
    data: { photos: next },
  });

  revalidatePath(`/${locale}/fields/${fieldId}`);
}
