import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayerCard, type PlayerCardData } from "@/components/players/PlayerCard";
import { POSITIONS, DISTRICTS } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Position, SkillLevel } from "@prisma/client";

const ALL_POSITIONS: Position[] = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];
const SKILLS: { value: SkillLevel }[] = [
  { value: "BEGINNER" },
  { value: "INTERMEDIATE" },
  { value: "ADVANCED" },
];

export default async function PlayersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { position?: string; district?: string; skill?: string; back?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();

  const positionFilter = ALL_POSITIONS.includes(searchParams.position as Position)
    ? (searchParams.position as Position)
    : null;
  const districtFilter = DISTRICTS.includes(searchParams.district ?? "")
    ? (searchParams.district as string)
    : null;
  const skillFilter = (SKILLS.find((s) => s.value === searchParams.skill)?.value) ?? null;

  const players = await prisma.user.findMany({
    where: {
      id: { not: session!.user.id },
      isOpenToInvite: true,
      ...(positionFilter ? { position: positionFilter } : {}),
      ...(districtFilter ? { district: districtFilter } : {}),
      ...(skillFilter ? { skillLevel: skillFilter } : {}),
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  const enriched: PlayerCardData[] = await Promise.all(
    players.map(async (p) => {
      const stats = await getPlayerStats(p.id);
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        position: p.position,
        skillLevel: p.skillLevel,
        district: p.district,
        attendanceRate: stats.attendanceRate,
        gamesPlayed: stats.gamesPlayed,
        isOpenToInvite: p.isOpenToInvite,
      };
    }),
  );

  enriched.sort((a, b) => (b.attendanceRate ?? -1) - (a.attendanceRate ?? -1));

  const queryFor = (overrides: Record<string, string | null>) => {
    const q = new URLSearchParams();
    if (overrides.position ?? positionFilter)
      q.set("position", overrides.position ?? positionFilter!);
    if (overrides.district ?? districtFilter)
      q.set("district", overrides.district ?? districtFilter!);
    if (overrides.skill ?? skillFilter) q.set("skill", overrides.skill ?? skillFilter!);
    if (searchParams.back) q.set("back", searchParams.back);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        {searchParams.back && <BackButton href={searchParams.back} />}
        <div className="font-display font-extrabold text-[22px]">{t("players.title")}</div>
      </div>

      <div className="px-6 pt-4 flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/players${queryFor({ position: null })}`}
            label={t("players.all")}
            active={!positionFilter}
          />
          {POSITIONS.map((p) => (
            <Chip
              key={p.value}
              href={`/${locale}/players${queryFor({ position: p.value })}`}
              label={t(`positions.${p.value}`)}
              active={positionFilter === p.value}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/players${queryFor({ district: null })}`}
            label={t("players.all_districts")}
            active={!districtFilter}
          />
          {DISTRICTS.map((d) => (
            <Chip
              key={d}
              href={`/${locale}/players${queryFor({ district: d })}`}
              label={d}
              active={districtFilter === d}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip
            href={`/${locale}/players${queryFor({ skill: null })}`}
            label={t("players.level_any")}
            active={!skillFilter}
          />
          {SKILLS.map((s) => (
            <Chip
              key={s.value}
              href={`/${locale}/players${queryFor({ skill: s.value })}`}
              label={t(`skills.${s.value}`)}
              active={skillFilter === s.value}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
        {enriched.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">🔍</span>}
            title={t("empty.no_results")}
            description={t("players.clear_filters")}
          />
        ) : (
          enriched.map((p) => <PlayerCard key={p.id} player={p} />)
        )}
      </div>
    </>
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
