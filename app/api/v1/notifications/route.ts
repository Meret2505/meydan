import { requireOnboarded } from "@/lib/api/auth";
import { handler, ok } from "@/lib/api/response";
import { listNotifications, markAllRead } from "@/lib/services/notifications";

/**
 * The notifications list for the mobile bell screen.
 *
 * GET mirrors the web notifications page (newest first, capped at 80) and adds
 * the unread count so the client can clear the badge without a second call to
 * unread-count. POST marks everything read — the same effect the web page's
 * mark-all-read-on-mount has.
 *
 * Auth matches the sibling unread-count route: requireOnboarded, the mobile
 * bearer-token guard, not next-auth's cookie session.
 */
export const GET = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);

  const items = await listNotifications(userId);
  const unreadCount = items.filter((n) => !n.isRead).length;

  return ok({
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: (n.data ?? null) as Record<string, unknown> | null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
});

export const POST = handler(async (request: Request) => {
  const { userId } = await requireOnboarded(request);
  await markAllRead(userId);
  return ok({ ok: true });
});
