import { requireOnboarded } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { countUnreadNotifications } from "@/lib/services/notifications";

/**
 * Unread notification count for the bell badge on the feed.
 *
 * Split out from the (not yet built) notifications list because the feed needs
 * only this number, and fetching 80 notification rows to render a dot would be
 * wasteful on a mobile connection.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);

  const count = await countUnreadNotifications(userId);

  return ok({ count });
});
