import { requireOnboarded } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { getProfileStats } from "@/lib/services/profile-stats";

/**
 * The profile page's stats block: attendance aggregate plus the last few
 * completed games. Kept separate from GET /me so a cold profile render can
 * show identity immediately and let the heavier aggregate stream in, matching
 * how the web page suspends it.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);

  return ok(await getProfileStats(userId));
});
