import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { storage, parseObjectUrl } from "@/lib/storage";

/**
 * Image uploads, extracted from app/actions/uploads.ts so the web actions and
 * the mobile API share one implementation.
 *
 * Two long-standing storage bugs are fixed here rather than carried over:
 * removing an avatar used to null the DB column and leave the object behind
 * forever, and removing a field photo raced concurrent uploads (see below).
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Soft cap on a field's gallery. */
const MAX_FIELD_PHOTOS = 8;

/** A decoded upload — the transport (FormData, multipart) is the caller's job. */
export type UploadInput = {
  bytes: Buffer;
  mime: string;
  filename?: string;
};

export type UploadError =
  | "invalid_file"
  | "too_large"
  | "unsupported_type"
  | "rate_limited"
  | "storage_failed"
  | "not_found"
  | "forbidden"
  | "gallery_full";

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: UploadError };

/** Shared with field-submissions.ts so a submission photo gets the same extension logic. */
export function extFor(name: string | undefined, mime: string) {
  const fromName = name?.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Shared shape checks; the caller supplies already-decoded bytes. Exported
 * for field-submissions.ts, whose photo error union is a superset of this
 * one (it also has too_many_photos, not_found, forbidden as submission-review
 * states) — this only ever returns the four shape-check members.
 */
export function validate(
  input: UploadInput,
): "invalid_file" | "too_large" | "unsupported_type" | null {
  if (!input.bytes || input.bytes.length === 0) return "invalid_file";
  if (input.bytes.length > MAX_UPLOAD_BYTES) return "too_large";
  if (!ALLOWED_MIME.includes(input.mime)) return "unsupported_type";
  return null;
}

/**
 * Replaces the caller's avatar.
 *
 * The previous object is deleted after the new URL is committed — losing the
 * old file matters far less than failing the upload, so a failed cleanup is
 * swallowed.
 */
export async function uploadAvatar(
  userId: string,
  input: UploadInput,
): Promise<UploadResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  // 20 avatar uploads per user per hour — plenty for real use, caps abuse.
  const limit = await rateLimit(`upload:avatar:${userId}`, 20, 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "rate_limited" };

  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  const ext = extFor(input.filename, input.mime);
  const path = `${userId}/${Date.now()}-${randomUUID()}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await storage.put("avatars", path, input.bytes, input.mime);
  } catch (e) {
    console.warn("[upload] avatar failed:", (e as Error).message);
    return { ok: false, error: "storage_failed" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: publicUrl },
  });

  await removeObject(previous?.avatar ?? null);

  return { ok: true, url: publicUrl };
}

export type RemoveAvatarResult = { ok: true };

/**
 * Clears the caller's avatar.
 *
 * Previously this only nulled the column, orphaning the object in storage
 * forever; the file is now deleted too (best effort — the DB is the source of
 * truth, so a storage failure must not fail the request).
 */
export async function removeAvatar(userId: string): Promise<RemoveAvatarResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  await prisma.user.update({ where: { id: userId }, data: { avatar: null } });
  await removeObject(user?.avatar ?? null);

  return { ok: true };
}

/** Best-effort delete of a stored object addressed by its public URL. */
async function removeObject(url: string | null): Promise<void> {
  if (!url) return;
  const parsed = parseObjectUrl(url);
  if (!parsed) return;
  try {
    await storage.remove(parsed.bucket, parsed.path);
  } catch {
    /* swallow — the DB no longer references it either way */
  }
}

/**
 * Adds a photo to a field's gallery. Admin only: fields are shared and curated,
 * so any signed-in user being able to write here would let them deface or wipe
 * any field's gallery.
 */
export async function uploadFieldPhoto(
  userId: string,
  fieldId: string,
  input: UploadInput,
): Promise<UploadResult> {
  if (!(await isAdmin(userId))) return { ok: false, error: "forbidden" };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    select: { photos: true },
  });
  if (!field) return { ok: false, error: "not_found" };
  if (field.photos.length >= MAX_FIELD_PHOTOS) {
    return { ok: false, error: "gallery_full" };
  }

  const ext = extFor(input.filename, input.mime);
  const path = `${fieldId}/${Date.now()}-${randomUUID()}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await storage.put("field-photos", path, input.bytes, input.mime);
  } catch (e) {
    console.warn("[upload] field photo failed:", (e as Error).message);
    return { ok: false, error: "storage_failed" };
  }

  // `push` is an atomic append, so a concurrent upload cannot clobber this one.
  await prisma.field.update({
    where: { id: fieldId },
    data: { photos: { push: publicUrl } },
  });

  return { ok: true, url: publicUrl };
}

export type RemovePhotoResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "not_found" | "photo_not_found" };

/**
 * Removes one photo from a field's gallery.
 *
 * The read-filter-write is done under a row lock. Previously it replaced the
 * whole array from a stale read, so a photo uploaded between the read and the
 * write was silently dropped — the classic TOCTOU on a scalar list, and there
 * is no atomic "remove element" for a Prisma scalar list to use instead.
 */
export async function removeFieldPhoto(
  userId: string,
  fieldId: string,
  photoUrl: string,
): Promise<RemovePhotoResult> {
  if (!(await isAdmin(userId))) return { ok: false, error: "forbidden" };

  const outcome = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM fields WHERE id = ${fieldId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false as const, error: "not_found" as const };

    const field = await tx.field.findUnique({
      where: { id: fieldId },
      select: { photos: true },
    });
    if (!field) return { ok: false as const, error: "not_found" as const };

    const next = field.photos.filter((p) => p !== photoUrl);
    if (next.length === field.photos.length) {
      return { ok: false as const, error: "photo_not_found" as const };
    }

    await tx.field.update({ where: { id: fieldId }, data: { photos: next } });
    return { ok: true as const };
  });

  if (!outcome.ok) return outcome;

  await removeObject(photoUrl);
  return { ok: true };
}
