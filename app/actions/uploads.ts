"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
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

  const sb = supabaseAdmin();
  const { error: upErr } = await sb.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) {
    console.warn("[upload] avatar failed:", upErr.message);
    return;
  }
  const {
    data: { publicUrl },
  } = sb.storage.from("avatars").getPublicUrl(path);

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

  const sb = supabaseAdmin();
  const { error: upErr } = await sb.storage
    .from("field-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (upErr) {
    console.warn("[upload] field photo failed:", upErr.message);
    return;
  }
  const {
    data: { publicUrl },
  } = sb.storage.from("field-photos").getPublicUrl(path);

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

  // Try to remove from storage too (path is the suffix after /field-photos/)
  try {
    const url = new URL(photoUrl);
    const marker = "/field-photos/";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const objectPath = url.pathname.slice(idx + marker.length);
      const sb = supabaseAdmin();
      await sb.storage.from("field-photos").remove([objectPath]);
    }
  } catch {
    /* swallow */
  }

  await prisma.field.update({
    where: { id: fieldId },
    data: { photos: next },
  });

  revalidatePath(`/${locale}/fields/${fieldId}`);
}
