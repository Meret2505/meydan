import { enforceRateLimit, PER_DAY } from "@/lib/api/rate-limit";
import { z } from "zod";
import { requireOnboarded } from "@/lib/api/auth";
import { badRequest, notFound } from "@/lib/api/errors";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameCardDto, toGameDetailDto } from "@/lib/api/serializers/game";
import { parseJson } from "@/lib/api/validate";
import { fetchGamesFeed, getGameDetail } from "@/lib/services/game-queries";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { createGame } from "@/lib/services/games";

/**
 * The games feed, in the two buckets the UI renders: `open` (joinable games
 * near the user) and `mine` (organized or joined).
 *
 * Both are returned in one response and both are capped at 50, matching the
 * web board. The today / five-a-side / needs-goalie chips filter this payload
 * client-side, so switching them costs no round-trip.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  const origin = originOf(request);

  // The bell badge ships with the feed: the client used to spend a second
  // full HTTPS round trip on one integer, on a link where the handshake
  // costs more than the payload. The standalone endpoint stays for the
  // targeted refresh after the notifications screen marks everything read.
  const [{ open, mine }, unread] = await Promise.all([
    fetchGamesFeed(userId),
    countUnreadNotifications(userId),
  ]);

  return ok({
    open: open.map((game) => toGameCardDto(game, origin, userId)),
    mine: mine.map((game) => toGameCardDto(game, origin, userId)),
    unread,
  });
});

const createSchema = z
  .object({
    scheduledAt: z.string(),
    fieldId: z.string().nullish(),
    fieldName: z.string().nullish(),
    totalSpots: z.number().int(),
    pricePerPlayer: z.number().int().nullish(),
    notes: z.string().nullish(),
    neededPositions: z.array(z.string()).default([]),
  })
  .strict();

/**
 * Creates a game (the caller is auto-joined) and returns its full detail, so
 * the client can navigate straight to the new game with no follow-up GET.
 */
export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  await enforceRateLimit("create-game", userId, 20, PER_DAY);
  const body = await parseJson(request, createSchema);

  const result = await createGame(userId, {
    scheduledAt: body.scheduledAt,
    fieldId: body.fieldId ?? null,
    fieldName: body.fieldName ?? null,
    totalSpots: body.totalSpots,
    pricePerPlayer: body.pricePerPlayer ?? null,
    notes: body.notes ?? null,
    neededPositions: body.neededPositions,
  });
  // Pass the service's own code through: "game_in_past" is actionable ("pick a
  // future time"), while a bare invalid_input is not.
  if (!result.ok) throw badRequest(result.error);

  const detail = await getGameDetail(result.gameId, userId);
  if (!detail) throw notFound("game_not_found");

  return ok(toGameDetailDto(detail, originOf(request)));
});
