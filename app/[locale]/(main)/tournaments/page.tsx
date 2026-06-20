import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { tournamentStatus, type TournamentStatus } from "@/lib/tournament-status";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<TournamentStatus, string> = {
  upcoming: "bg-white/8 text-text-muted",
  ongoing: "bg-primary/15 text-primary",
  ended: "bg-white/5 text-text-muted",
  cancelled: "bg-danger/15 text-danger",
};

export default async function TournamentsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { tab?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();

  const tab =
    searchParams.tab === "ended"
      ? "ended"
      : searchParams.tab === "ongoing"
      ? "ongoing"
      : "upcoming";

  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: { select: { teams: true, matches: true } },
    },
    orderBy: { startDate: tab === "ended" ? "desc" : "asc" },
    take: 80,
  });

  const filtered = tournaments.filter((tr) => {
    const s = tournamentStatus(tr);
    if (tab === "upcoming") return s === "upcoming";
    if (tab === "ongoing") return s === "ongoing";
    return s === "ended" || s === "cancelled";
  });

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[25px]">
          {t("nav.tournaments")}
        </div>
        <Link
          href={`/${locale}/tournaments/create`}
          className="h-9 px-3 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] inline-flex items-center"
        >
          {t("tournaments.create_button")}
        </Link>
      </div>

      <div className="px-6 pt-4 flex bg-white/5 rounded-2xl p-1">
        <TabLink locale={locale} active={tab === "upcoming"} tab="upcoming" label={t("tournaments.tab_upcoming")} />
        <TabLink locale={locale} active={tab === "ongoing"} tab="ongoing" label={t("tournaments.tab_ongoing")} />
        <TabLink locale={locale} active={tab === "ended"} tab="ended" label={t("tournaments.tab_ended")} />
      </div>

      <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">🏆</span>}
            title={t("tournaments.empty_title")}
            description={
              tab === "upcoming"
                ? t("tournaments.empty_sub_upcoming")
                : tab === "ongoing"
                ? t("tournaments.empty_sub_ongoing")
                : t("tournaments.empty_sub_ended")
            }
            action={
              tab === "upcoming"
                ? { label: t("tournaments.create_tournament"), href: `/${locale}/tournaments/create` }
                : undefined
            }
          />
        ) : (
          filtered.map((tr) => {
            const s = tournamentStatus(tr);
            return (
              <Link
                key={tr.id}
                href={`/${locale}/tournaments/${tr.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border active:scale-[0.995] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-display font-extrabold text-[20px]">
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-[16px] truncate">
                    {tr.name}
                  </div>
                  <div className="text-text-muted text-[12.5px] mt-0.5">
                    {dateFmt.format(tr.startDate)}
                    {tr.endDate ? ` — ${dateFmt.format(tr.endDate)}` : ""} ·{" "}
                    {tr._count.teams} {t("tournaments.teams_count")} · {tr._count.matches} {t("tournaments.matches_count")}
                  </div>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10.5px] font-display font-extrabold uppercase shrink-0",
                    STATUS_TONE[s],
                  )}
                >
                  {t("tournaments.status_" + s)}
                </span>
              </Link>
            );
          })
        )}
      </div>
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
  tab: "upcoming" | "ongoing" | "ended";
  label: string;
}) {
  return (
    <Link
      href={`/${locale}/tournaments?tab=${tab}`}
      className={cn(
        "flex-1 text-center py-2.5 rounded-xl font-display font-bold text-[14px]",
        active ? "bg-bg text-text shadow" : "text-text-muted",
      )}
    >
      {label}
    </Link>
  );
}
