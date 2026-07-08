import Link from "next/link";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { type GameCardData } from "@/components/games/GameCard";
import { GamesBoard, type GamesData, type Tab, type Chip } from "@/components/games/GamesBoard";
import { gameFormat } from "@/lib/game-format";

type UserMeta = { name: string; district: string | null } | null;

export default async function GamesPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ tab?: string; chip?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const initialTab: Tab = searchParams.tab === "mine" ? "mine" : "open";
  const initialChip = (["today", "five", "goalie"] as const).includes(
    searchParams.chip as Chip,
  )
    ? (searchParams.chip as Chip)
    : undefined;

  const session = await getSession();
  const userId = session!.user.id;
  const t = await getTranslations();

  // Per-user reads fire without blocking the shell. Both game sets are fetched
  // once (gamesPromise) and streamed to the client board, which then switches
  // tabs/chips in memory — no per-switch server round-trip.
  const userMetaPromise = prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, district: true },
  });
  const unreadPromise = prisma.notification.count({
    where: { userId, isRead: false },
  });
  const gamesPromise = fetchGames(userId, userMetaPromise);

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4">
        <div className="flex justify-between items-center">
          <div className="font-display font-extrabold text-[25px]">
            {t("games.feed_title")}
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <DistrictPill promise={userMetaPromise} />
            </Suspense>
            <Link
              href={`/${locale}/notifications`}
              aria-label="notifications"
              className="relative w-10 h-10 rounded-xl bg-[var(--overlay)] border border-border flex items-center justify-center text-text-muted"
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
              <Suspense fallback={null}>
                <UnreadDot promise={unreadPromise} />
              </Suspense>
            </Link>
          </div>
        </div>
      </div>

      <GamesBoard
        gamesPromise={gamesPromise}
        initialTab={initialTab}
        initialChip={initialChip}
        locale={locale}
      />

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

async function fetchGames(
  userId: string,
  districtPromise: Promise<UserMeta>,
): Promise<GamesData> {
  const userMeta = await districtPromise;
  const district = userMeta?.district ?? null;

  const now = new Date();
  const baseWhere = {
    scheduledAt: { gte: now },
    status: { in: ["OPEN" as const, "FULL" as const] },
  };
  const include = {
    field: true,
    organizer: { select: { id: true, name: true } },
    participants: { include: { user: { select: { id: true, name: true } } } },
  };

  const [openRaw, mineRaw] = await Promise.all([
    prisma.game.findMany({
      where: {
        ...baseWhere,
        participants: { none: { userId } },
        organizerId: { not: userId },
        ...(district ? { OR: [{ field: { district } }, { field: null }] } : {}),
      },
      include,
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    prisma.game.findMany({
      where: {
        ...baseWhere,
        OR: [{ organizerId: userId }, { participants: { some: { userId } } }],
      },
      include,
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
  ]);

  const toData = (g: (typeof openRaw)[number], mine: boolean): GameCardData => ({
    id: g.id,
    scheduledAt: g.scheduledAt,
    venue: g.field?.name ?? g.fieldName ?? "—",
    district: g.field?.district ?? null,
    format: gameFormat(g),
    totalSpots: g.totalSpots,
    joinedCount: g.participants.length,
    neededPositions: g.neededPositions,
    participants: g.participants.map((p) => ({ id: p.user.id, name: p.user.name })),
    mine,
  });

  return {
    open: openRaw.map((g) => toData(g, false)),
    mine: mineRaw.map((g) => toData(g, g.organizerId === userId)),
  };
}

async function DistrictPill({ promise }: { promise: Promise<UserMeta> }) {
  const user = await promise;
  if (!user?.district) return null;
  return (
    <div className="text-text-muted text-[13px] font-semibold flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-primary" />
      {user.district}
    </div>
  );
}

async function UnreadDot({ promise }: { promise: Promise<number> }) {
  const count = await promise;
  if (count <= 0) return null;
  return (
    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-primary border border-bg" />
  );
}
