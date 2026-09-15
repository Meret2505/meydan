import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, conflict, rateLimited } from "@/lib/api/errors";
import { handler, ok } from "@/lib/api/response";
import { parseJson } from "@/lib/api/validate";
import { createFieldSubmission } from "@/lib/services/field-submissions";

const createSchema = z
  .object({
    name: z.string(),
    address: z.string(),
    district: z.string(),
    surface: z.string(),
    capacity: z.number(),
    phone: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .strict();

/**
 * Submits a new field for admin review. See lib/services/field-submissions.ts
 * for the validation rules — this is a thin wrapper, same shape as
 * POST /api/v1/teams.
 */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  const input = await parseJson(request, createSchema);

  const result = await createFieldSubmission(userId, input);
  if (!result.ok) {
    if (result.error === "too_many_pending") throw conflict("too_many_pending");
    if (result.error === "rate_limited") throw rateLimited();
    throw badRequest();
  }

  return ok({ id: result.submissionId, status: "PENDING" });
});
