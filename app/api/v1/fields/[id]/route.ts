import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toFieldDetailDto } from "@/lib/api/serializers/field-detail";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

/** Full detail for one field. */
export const GET = handler(async (request: Request, context: Context) => {
  await requireOnboarded(request);
  const { id } = await context.params;

  const field = await prisma.field.findUnique({
    where: { id },
    include: { _count: { select: { games: true } } },
  });
  if (!field) throw notFound("field_not_found");

  return ok(toFieldDetailDto(field, originOf(request)));
});
