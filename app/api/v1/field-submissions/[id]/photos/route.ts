import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors";
import { absoluteImageUrl, originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { addSubmissionPhoto } from "@/lib/services/field-submissions";

type Context = { params: Promise<{ id: string }> };

/**
 * Attaches a photo to the caller's own PENDING submission. Multipart, same
 * shape as POST /api/v1/me/avatar — streams the picked image without
 * base64 inflating it by a third.
 */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest();

  const result = await addSubmissionPhoto(userId, id, {
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    filename: file.name,
  });

  if (!result.ok) {
    if (result.error === "not_found") throw notFound("submission_not_found");
    if (result.error === "forbidden") throw forbidden();
    if (result.error === "too_many_photos") throw conflict("too_many_photos");
    if (result.error === "storage_failed") throw conflict("storage_failed");
    // invalid_file / too_large / unsupported_type are all caller mistakes.
    throw badRequest();
  }

  const origin = originOf(request);
  return ok({ photos: result.photos.map((p) => absoluteImageUrl(p, origin)) });
});
