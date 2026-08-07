"use server";

import { auth } from "@/lib/auth";
import {
  removeAvatar as removeAvatarService,
  removeFieldPhoto as removeFieldPhotoService,
  uploadAvatar as uploadAvatarService,
  uploadFieldPhoto as uploadFieldPhotoService,
  type UploadInput,
} from "@/lib/services/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * These delegate to lib/services/uploads.ts so the mobile API runs the same
 * validation, rate limiting and storage cleanup. A rejected upload (too large,
 * wrong type, rate limited, not an admin) still resolves silently here and
 * simply re-renders, as it always has.
 */
async function toUploadInput(file: unknown): Promise<UploadInput | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    filename: file.name,
  };
}

export async function uploadAvatar(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const locale = String(formData.get("locale") ?? "ru");

  const input = await toUploadInput(formData.get("file"));
  if (!input) return;
  await uploadAvatarService(userId, input);

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/edit`);
}

export async function removeAvatar(locale: string): Promise<void> {
  const userId = await requireUserId();
  await removeAvatarService(userId);

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/edit`);
}

export async function uploadFieldPhoto(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const fieldId = String(formData.get("fieldId") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  const input = await toUploadInput(formData.get("file"));
  if (!fieldId || !input) return;
  await uploadFieldPhotoService(userId, fieldId, input);

  revalidatePath(`/${locale}/fields/${fieldId}`);
  revalidatePath(`/${locale}/fields`);
}

export async function removeFieldPhoto(
  fieldId: string,
  photoUrl: string,
  locale: string,
): Promise<void> {
  const userId = await requireUserId();
  await removeFieldPhotoService(userId, fieldId, photoUrl);

  revalidatePath(`/${locale}/fields/${fieldId}`);
}
