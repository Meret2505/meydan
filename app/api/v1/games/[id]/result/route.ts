import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameDetailDto } from "@/lib/api/serializers/game";
import { parseJson } from "@/lib/api/validate";
import { getGameDetail } from "@/lib/services/game-queries";
import { recordGameResult } from "@/lib/services/game-result";

/**
 * Writing up a played game: attendance, and optionally the score.
 *
 * The app had no way to do this at all — only a web server action, reachable
 * from a page the feeds stopped linking to the moment the game kicked off. So
 * attendance was never recorded, and every reliability rating in the app sat
 * at zero.
 *
 * Both halves are optional individually but not together: attendance alone is
 * a perfectly good write-up (it is what the ratings are built from), a score
 * alone is fine too, and an empty body is rejected rather than silently
 * closing the game.
 */
const schema = z.object({
  scoreHome: z.number().int().min(0).max(99).nullish(),
  scoreAway: z.number().int().min(0).max(99).nullish(),
  attended: z.record(z.string(), z.boolean()).optional(),
});

type Context = { params: Promise<{ id: string }> };

export const POST = handler(async (request: Request, context: Context) => {
  const { userId } = await requireOnboarded(request);
  const { id } = await context.params;
  const body = await parseJson(request, schema);

  const result = await recordGameResult(id, userId, body);
  if (!result.ok) {
    if (result.error === "not_found") throw notFound("game_not_found");
    if (result.error === "not_organizer") throw forbidden("not_organizer");
    throw badRequest(result.error);
  }

  // The updated detail comes back so the screen redraws from the server's
  // version rather than from what it hoped it had written.
  const detail = await getGameDetail(id, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});
