import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { notificationHref } from "@/lib/notification-routing";
import { MarkAllReadOnMount } from "./MarkAllReadOnMount";
import type { NotificationType } from "@prisma/client";

function relativeTime(d: Date, locale: string) {
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60_000);
  const hr = Math.round(diffMs / 3_600_000);
  const day = Math.round(diffMs / 86_400_000);
  if (min < 1) return locale === "tm" ? "şu pursat" : "только что";
  if (min < 60)
    return locale === "tm" ? `${min} min öň` : `${min} мин назад`;
  if (hr < 24) return locale === "tm" ? `${hr} sag öň` : `${hr} ч назад`;
  if (day < 7) return locale === "tm" ? `${day} gün öň` : `${day} д назад`;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

const TYPE_STYLE: Record<NotificationType, { icon: string; bg: string; color: string }> = {
  GAME_INVITE: { icon: "⚽", bg: "rgba(31,209,107,.14)", color: "#5BE39A" },
  PLAYER_JOINED: { icon: "✓", bg: "rgba(31,209,107,.14)", color: "#5BE39A" },
  SPOT_OPENED: { icon: "+", bg: "rgba(31,209,107,.14)", color: "#5BE39A" },
  GAME_REMINDER: { icon: "⏱", bg: "rgba(242,181,60,.16)", color: "#F2B53C" },
  RESULT_NEEDED: { icon: "✎", bg: "rgba(108,177,224,.16)", color: "#8FC4EE" },
  GAME_CANCELLED: { icon: "✕", bg: "rgba(224,85,106,.14)", color: "#E0556A" },
  TEAM_INVITE: { icon: "★", bg: "rgba(155,143,224,.16)", color: "#B3A8EC" },
};

export default async function NotificationsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const userId = session!.user.id;

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-3.5 px-6 pt-4">
        <BackButton href={`/${locale}/games`} />
        <div className="flex-1 font-display font-extrabold text-[21px]">
          {t("notifications.title")}
        </div>
        {unreadCount > 0 && (
          <span className="text-primary-soft font-display font-bold text-[13px]">
            {unreadCount}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🔔</span>}
          title={t("empty.no_notifications_title")}
          description={t("empty.no_notifications_sub")}
        />
      ) : (
        <div className="px-[18px] pt-3 pb-10 flex flex-col gap-[9px]">
          {items.map((n) => {
            const href = notificationHref(n.type, n.data, locale);
            const style = TYPE_STYLE[n.type];
            const unread = !n.isRead;
            return (
              <Link
                key={n.id}
                href={href}
                className="flex items-start gap-3 px-[15px] py-3.5 rounded-2xl border transition-colors"
                style={{
                  background: unread ? "rgba(31,209,107,.05)" : "#13181A",
                  borderColor: unread ? "rgba(31,209,107,.16)" : "rgba(255,255,255,.06)",
                }}
              >
                <div
                  className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0 text-[16px] font-display font-extrabold"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-[14px] leading-snug text-[#E7ECE8] ${
                      unread ? "font-bold" : "font-medium"
                    }`}
                  >
                    <span className="font-display font-bold text-text">{n.title}.</span>{" "}
                    {n.body}
                  </div>
                  <div className="text-[12px] text-[#6e756f] font-semibold mt-1.5">
                    {relativeTime(n.createdAt, locale)}
                  </div>
                </div>
                {unread && (
                  <span className="w-[9px] h-[9px] rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </Link>
            );
          })}
        </div>
      )}

      <MarkAllReadOnMount locale={locale} />
    </>
  );
}
