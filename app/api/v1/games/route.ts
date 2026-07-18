import { requireOnboarded } from "@/lib/api/auth";
import { originOf } from "@/lib/api/images";
import { handler, ok } from "@/lib/api/response";
import { toGameCardDto } from "@/lib/api/serializers/game";
import { fetchGamesFeed } from "@/lib/services/game-queries";

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

  const { open, mine } = await fetchGamesFeed(userId);

  return ok({
    open: open.map((game) => toGameCardDto(game, origin, userId)),
    mine: mine.map((game) => toGameCardDto(game, origin, userId)),
  });
});
