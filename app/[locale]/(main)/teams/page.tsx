import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamCard, type TeamCardData } from "@/components/teams/TeamCard";
import { DISTRICTS } from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function TeamsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { district?: string; tab?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const userId = session!.user.id;

  const tab = searchParams.tab === "mine" ? "mine" : "all";
  const districtFilter = DISTRICTS.includes(searchParams.district ?? "")
    ? (searchParams.district as string)
    : null;

  const teams = await prisma.team.findMany({
    where: {
      ...(districtFilter ? { district: districtFilter } : {}),
      ...(tab === "mine" ? { members: { some: { userId } } } : {}),
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ district: "asc" }, { name: "asc" }],
    take: 50,
  });

  const cards: TeamCardData[] = teams.map((t) => {
    const captain = t.members.find((m) => m.isCaptain);
    return {
      id: t.id,
      name: t.name,
      district: t.district,
      memberCount: t.members.length,
      captainName: captain?.user.name ?? null,
    };
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[25px]">{t("nav.teams")}</div>
        <Link
          href={`/${locale}/teams/create`}
          className="h-9 px-3 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] inline-flex items-center"
        >
          + создать
        </Link>
      </div>

      <div className="px-6 pt-4 flex bg-white/5 rounded-2xl p-1">
        <TabLink locale={locale} active={tab === "all"} tab="all" label="Все" />
        <TabLink locale={locale} active={tab === "mine"} tab="mine" label="Мои" />
      </div>

      <div className="px-6 pt-3 flex gap-2 overflow-x-auto scrollbar-none">
        <Chip
          href={`/${locale}/teams?tab=${tab}`}
          label="Все районы"
          active={!districtFilter}
        />
        {DISTRICTS.map((d) => (
          <Chip
            key={d}
            href={`/${locale}/teams?tab=${tab}&district=${encodeURIComponent(d)}`}
            label={d}
            active={districtFilter === d}
          />
        ))}
      </div>

      <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
        {cards.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">👥</span>}
            title={tab === "mine" ? t("empty.no_teams") : "Команд пока нет"}
            description={
              tab === "mine"
                ? "Создай свою или присоединись к существующей."
                : "Будь первым — собери команду."
            }
            action={{ label: "Создать команду", href: `/${locale}/teams/create` }}
          />
        ) : (
          cards.map((c) => <TeamCard key={c.id} team={c} />)
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
  tab: "all" | "mine";
  label: string;
}) {
  return (
    <Link
      href={`/${locale}/teams?tab=${tab}`}
      className={cn(
        "flex-1 text-center py-2.5 rounded-xl font-display font-bold text-[14px]",
        active ? "bg-bg text-text shadow" : "text-text-muted",
      )}
    >
      {label}
    </Link>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-full whitespace-nowrap border font-bold text-[13px]",
        active
          ? "bg-primary/13 border-primary/35 text-primary"
          : "bg-white/5 border-white/8 text-text/80",
      )}
    >
      {label}
    </Link>
  );
}
