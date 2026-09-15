import { requireAdmin } from "@/lib/api/auth";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toFieldSubmissionDto } from "@/lib/api/serializers/field-submission";
import { listPendingSubmissions } from "@/lib/services/field-submissions";

/** The moderation queue — PENDING submissions only, oldest first. Admin only. */
export const GET = handler(async (request: Request) => {
  await requireAdmin(request);

  const submissions = await listPendingSubmissions();
  const origin = originOf(request);

  return ok({ submissions: submissions.map((s) => toFieldSubmissionDto(s, origin)) });
});
