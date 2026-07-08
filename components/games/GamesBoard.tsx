"use client";

import { Suspense, use, useState } from "react";
import { useTranslations } from "next-intl";
import { GameCard, type GameCardData } from "@/components/games/GameCard";
import { GameCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedOfflineGuard } from "@/components/games/FeedOffline";
import { cn } from "@/lib/utils";

export type Tab = "open" | "mine";
export type Chip = "today" | "five" | "goalie";
export type GamesData = { open: GameCardData[]; mine: GameCardData[] };

/**
 * Client-side games feed. Both the "open" and "my games" sets are fetched once
 * on the server and streamed in via `gamesPromise`; after that, switching tabs
 * or toggling chips is pure local state over data already in memory — instant,
 * with no navigation or server round-trip (which is what made the old
 * URL-driven tabs feel slow in the WebView).
 */
export function GamesBoard({
  gamesPromise,
  initialTab,
  initialChip,
  locale,
}: {
  gamesPromise: Promise<GamesData>;
  initialTab: Tab;
  initialChip?: Chip;
  locale: string;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [chip, setChip] = useState<Chip | undefined>(initialChip);

  const selectTab = (next: Tab) => {
    setTab(next);
    setChip(undefined); // matches the old behaviour: switching tabs clears the chip
  };
  const toggleChip = (next: Chip) => setChip((c) => (c === next ? undefined : next));

  return (
    <>
      <div className="px-6">
        <div className="flex bg-[var(--overlay)] rounded-2xl p-1 mt-4">
          <TabButton active={tab === "open"} onClick={() => selectTab("open")} label={t("games.open_games")} />
          <TabButton active={tab === "mine"} onClick={() => selectTab("mine")} label={t("games.my_games")} />
        </div>

        <div className="flex gap-2 mt-3.5 overflow-x-auto scrollbar-none">
          <ChipButton active={chip === "today"} onClick={() => toggleChip("today")} label={t("games.today")} />
          <ChipButton active={chip === "five"} onClick={() => toggleChip("five")} label={t("games.chip_five")} />
          <ChipButton active={chip === "goalie"} onClick={() => toggleChip("goalie")} label={t("games.chip_goalie")} />
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 flex flex-col gap-3.5">
        <FeedOfflineGuard>
          <Suspense fallback={<FeedSkeleton />}>
            <GamesList gamesPromise={gamesPromise} tab={tab} chip={chip} locale={locale} />
          </Suspense>
        </FeedOfflineGuard>
      </div>
    </>
  );
}

function GamesList({
  gamesPromise,
  tab,
  chip,
  locale,
}: {
  gamesPromise: Promise<GamesData>;
  tab: Tab;
  chip: Chip | undefined;
  locale: string;
}) {
  const t = useTranslations();
  // Resolves once; on later tab/chip changes `use` returns the cached value
  // synchronously, so the list re-filters instantly without re-suspending.
  const data = use(gamesPromise);
  const list = applyChip(tab === "open" ? data.open : data.mine, chip);

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<BallIcon />}
        title={t(tab === "open" ? "empty.no_games" : "empty.no_my_games")}
        description={tab === "open" ? t("games.create_first_sub") : undefined}
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
      {list.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </>
  );
}

function applyChip(list: GameCardData[], chip: Chip | undefined): GameCardData[] {
  if (!chip) return list;
  if (chip === "five") return list.filter((g) => g.totalSpots === 10);
  if (chip === "goalie") return list.filter((g) => g.neededPositions.includes("GOALKEEPER"));
  // "today": scheduled before the start of tomorrow (local time).
  const endOfToday = new Date();
  endOfToday.setHours(0, 0, 0, 0);
  endOfToday.setDate(endOfToday.getDate() + 1);
  return list.filter((g) => g.scheduledAt < endOfToday);
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 text-center py-2.5 rounded-xl font-display font-bold text-[14px] transition-colors",
        active ? "bg-bg text-text shadow" : "text-text-muted",
      )}
    >
      {label}
    </button>
  );
}

function ChipButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-full font-bold text-[13px] whitespace-nowrap border transition-colors active:scale-95",
        active
          ? "bg-primary/13 border-primary/35 text-primary"
          : "bg-[var(--overlay)] border-border text-text/80",
      )}
    >
      {label}
    </button>
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

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-9 h-9">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4.2 3.1-1.6 5h-5.2L7.8 10z" />
    </svg>
  );
}
