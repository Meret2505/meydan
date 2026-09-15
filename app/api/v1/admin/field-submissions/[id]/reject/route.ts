import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { rejectFieldSubmission } from "@/lib/services/field-submissions";

const rejectSchema = z.object({ reason: z.string().nullable().optional() }).strict();

type Context = { params: Promise<{ id: string }> };

/** Rejects a submission and notifies the author, with an optional reason. Admin only. */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId: adminId } = await requireAdmin(request);
  const { id } = await context.params;
  const { reason } = await parseJson(request, rejectSchema);

  const result = await rejectFieldSubmission(adminId, id, reason);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("submission_not_found");
    throw conflict("already_reviewed");
  }

  return ok({ ok: true });
});
