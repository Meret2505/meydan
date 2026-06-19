import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { notificationHref, notificationIcon } from "@/lib/notification-routing";
import { MarkAllReadOnMount } from "./MarkAllReadOnMount";

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

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/games`} />
        <div className="font-display font-extrabold text-[22px]">
          {t("notifications.title")}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🔔</span>}
          title={t("empty.no_notifications_title")}
          description={t("empty.no_notifications_sub")}
        />
      ) : (
        <div className="px-6 pt-4 pb-8 flex flex-col gap-2">
          {items.map((n) => {
            const href = notificationHref(n.type, n.data, locale);
            return (
              <Link
                key={n.id}
                href={href}
                className={`flex items-start gap-3 p-3 rounded-2xl border ${
                  n.isRead
                    ? "bg-surface border-border"
                    : "bg-primary/8 border-primary/30"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[18px] shrink-0">
                  {notificationIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-bold text-[14.5px] truncate">
                      {n.title}
                    </span>
                    <span className="text-text-muted text-[11.5px] shrink-0">
                      {relativeTime(n.createdAt, locale)}
                    </span>
                  </div>
                  <div className="text-text-muted text-[13px] mt-0.5 leading-snug">
                    {n.body}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <MarkAllReadOnMount locale={locale} />
    </>
  );
}
