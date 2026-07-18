import { requireOnboarded } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { getGameDetail } from "@/lib/services/game-queries";

type Context = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;

  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});
