import Link from "next/link";
import { Suspense } from "react";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameCardSkeleton } from "@/components/ui/Skeleton";
import { GameCard, type GameCardData } from "@/components/games/GameCard";
import { gameFormat } from "@/lib/game-format";
import { cn } from "@/lib/utils";

type Tab = "open" | "mine";
type Chip = "today" | "five" | "goalie";

export default async function GamesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { tab?: string; chip?: string };
}) {
  unstable_setRequestLocale(locale);
  const tab: Tab = searchParams.tab === "mine" ? "mine" : "open";
  const chip = (searchParams.chip as Chip | undefined) ?? undefined;

  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, district: true },
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: session!.user.id, isRead: false },
  });
  const t = await getTranslations();

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4">
        <div className="flex justify-between items-center">
          <div className="font-display font-extrabold text-[25px]">
            {t("games.feed_title")}
          </div>
          <div className="flex items-center gap-3">
            {user?.district && (
              <div className="text-text-muted text-[13px] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {user.district}
              </div>
            )}
            <Link
              href={`/${locale}/notifications`}
              aria-label="notifications"
              className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-text-muted"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.5 21a2 2 0 01-3 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-primary border border-bg" />
              )}
            </Link>
          </div>
        </div>

        <div className="flex bg-white/5 rounded-2xl p-1 mt-4">
          <TabLink locale={locale} active={tab === "open"} tab="open" label={t("games.open_games")} />
          <TabLink locale={locale} active={tab === "mine"} tab="mine" label={t("games.my_games")} />
        </div>

        <div className="flex gap-2 mt-3.5 overflow-x-auto scrollbar-none">
          <ChipLink locale={locale} tab={tab} chip="today" active={chip === "today"} label="Сегодня" />
          <ChipLink locale={locale} tab={tab} chip="five" active={chip === "five"} label="5×5" />
          <ChipLink
            locale={locale}
            tab={tab}
            chip="goalie"
            active={chip === "goalie"}
            label="Нужен вратарь"
          />
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 flex flex-col gap-3.5">
        <Suspense fallback={<FeedSkeleton />} key={`${tab}-${chip}`}>
          <Feed
            userId={session!.user.id}
            district={user?.district ?? null}
            tab={tab}
            chip={chip}
            locale={locale}
          />
        </Suspense>
      </div>

      <Link
        href={`/${locale}/games/create`}
        aria-label={t("games.create")}
        className="fixed right-5 bottom-24 w-[58px] h-[58px] rounded-2xl bg-primary text-primary-text flex items-center justify-center shadow-[0_14px_30px_-8px_rgba(34,197,94,.6)] font-display font-extrabold text-[28px]"
      >
        +
      </Link>
    </>
  );
}

function TabLink({
  locale,
  active,
  tab,
  label,
}: {
  locale: string;
  active: boolean;
  tab: Tab;
  label: string;
}) {
  return (
    <Link
      href={`/${locale}/games?tab=${tab}`}
      className={cn(
        "flex-1 text-center py-2.5 rounded-xl font-display font-bold text-[14px]",
        active ? "bg-bg text-text shadow" : "text-text-muted",
      )}
    >
      {label}
    </Link>
  );
}

function ChipLink({
  locale,
  tab,
  chip,
  active,
  label,
}: {
  locale: string;
  tab: Tab;
  chip: Chip;
  active: boolean;
  label: string;
}) {
  const href = active
    ? `/${locale}/games?tab=${tab}`
    : `/${locale}/games?tab=${tab}&chip=${chip}`;
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-full font-bold text-[13px] whitespace-nowrap border",
        active
          ? "bg-primary/13 border-primary/35 text-primary"
          : "bg-white/5 border-white/8 text-text/80",
      )}
    >
      {label}
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <>
      <GameCardSkeleton />
      <GameCardSkeleton />
      <GameCardSkeleton />
    </>
  );
}

async function Feed({
  userId,
  district,
  tab,
  chip,
  locale,
}: {
  userId: string;
  district: string | null;
  tab: Tab;
  chip: Chip | undefined;
  locale: string;
}) {
  const t = await getTranslations();

  const now = new Date();
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const baseWhere = {
    scheduledAt: { gte: now } as { gte: Date; lt?: Date },
    status: { in: ["OPEN" as const, "FULL" as const] },
  };

  if (chip === "today") baseWhere.scheduledAt.lt = startOfTomorrow;

  const where =
    tab === "open"
      ? {
          ...baseWhere,
          participants: { none: { userId } },
          organizerId: { not: userId },
          ...(district ? { OR: [{ field: { district } }, { field: null }] } : {}),
        }
      : {
          ...baseWhere,
          OR: [{ organizerId: userId }, { participants: { some: { userId } } }],
        };

  const games = await prisma.game.findMany({
    where,
    include: {
      field: true,
      organizer: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  const filtered = games.filter((g) => {
    if (chip === "five" && g.totalSpots !== 10) return false;
    if (chip === "goalie" && !g.neededPositions.includes("GOALKEEPER")) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<BallIcon />}
        title={t(tab === "open" ? "empty.no_games" : "empty.no_my_games")}
        description={
          tab === "open"
            ? "Создай первую — и позови игроков из своего района."
            : undefined
        }
        action={
          tab === "open"
            ? { label: t("games.create"), href: `/${locale}/games/create` }
            : undefined
        }
      />
    );
  }

  return (
    <>
      {filtered.map((g) => {
        const data: GameCardData = {
          id: g.id,
          scheduledAt: g.scheduledAt,
          venue: g.field?.name ?? g.fieldName ?? "—",
          district: g.field?.district ?? null,
          format: gameFormat(g),
          totalSpots: g.totalSpots,
          joinedCount: g.participants.length,
          neededPositions: g.neededPositions,
          participants: g.participants.map((p) => ({ id: p.user.id, name: p.user.name })),
          mine: g.organizerId === userId,
        };
        return <GameCard key={g.id} game={data} />;
      })}
    </>
  );
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-9 h-9">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4.2 3.1-1.6 5h-5.2L7.8 10z" />
    </svg>
  );
}
