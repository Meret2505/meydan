import { prisma } from "@/lib/prisma";

/**
 * Notification reads and read-state, extracted so the web notifications page
 * (app/[locale]/(main)/notifications) and the mobile API share one
 * implementation. Pure DB access — callers own auth and serialization.
 */

/**
 * The user's most recent notifications, newest first and capped at 80 — the
 * same window the web list renders. The cap keeps the mobile payload bounded;
 * older notifications age out of view rather than paginating.
 */
export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
}

/**
 * Unread total for the bell badge.
 *
 * Shared with the list endpoint, which used to count unread rows inside its own
 * 80-row window and so reported at most 80 — disagreeing with the badge.
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/**
 * Marks every unread notification for the user as read. Idempotent — a user
 * with nothing unread simply updates zero rows.
 */
export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
