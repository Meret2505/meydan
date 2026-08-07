import { requireAuth } from "@/lib/api/auth";
import { badRequest, conflict, rateLimited } from "@/lib/api/errors";
import { absoluteImageUrl, originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { removeAvatar, uploadAvatar } from "@/lib/services/uploads";

/**
 * Avatar upload. Multipart rather than JSON — the client streams the picked
 * image straight through without base64 inflating it by a third.
 *
 * requireAuth, not requireOnboarded: the web lets a user set an avatar from the
 * profile edit screen, and onboarding does not gate it.
 */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireAuth(request);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest();

  const result = await uploadAvatar(userId, {
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    filename: file.name,
  });

  if (!result.ok) {
    if (result.error === "rate_limited") throw rateLimited();
    if (result.error === "storage_failed") throw conflict("storage_failed");
    // too_large / unsupported_type / invalid_file are all caller mistakes.
    throw badRequest();
  }

  return ok({ avatar: absoluteImageUrl(result.url, originOf(request)) });
});

/** Clears the avatar and deletes the stored object. Idempotent. */
export const DELETE = handler(async (request: Request) => {
  const { userId } = await requireAuth(request);

  await removeAvatar(userId);

  return ok({ avatar: null });
});
