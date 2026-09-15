import { requireAdmin } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { approveFieldSubmission } from "@/lib/services/field-submissions";

type Context = { params: Promise<{ id: string }> };

/**
 * Approves a submission: creates the real Field and notifies the author.
 * Admin only. Rejects a submission that isn't PENDING with `already_reviewed`
 * so a double-tap (two admin devices, or a retried request) is safe.
 */
export const POST = handler(async (request: Request, context: Context) => {
  const { userId: adminId } = await requireAdmin(request);
  const { id } = await context.params;

  const result = await approveFieldSubmission(adminId, id);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("submission_not_found");
    throw conflict("already_reviewed");
  }

  return ok({ fieldId: result.fieldId });
});
