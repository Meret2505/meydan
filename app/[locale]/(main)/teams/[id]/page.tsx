import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats, attendanceTier } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { TeamActions } from "./TeamActions";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { getTeamColor } from "@/lib/team-color";

function initials(name: string) {
  return (name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?");
}

const ATT_COLOR: Record<ReturnType<typeof attendanceTier>, string> = {
  reliable: "var(--primary-soft)",
  ok: "var(--warning)",
  poor: "var(--danger)",
  new: "var(--text-muted)",
};

export default async function TeamDetailPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const viewerId = session!.user.id;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
        orderBy: [{ isCaptain: "desc" }, { joinedAt: "asc" }],
      },
      games: {
        where: { status: "COMPLETED" },
        select: { scoreHome: true, scoreAway: true },
      },
      _count: { select: { games: true } },
    },
  });
  if (!team) notFound();

  const viewer = team.members.find((m) => m.userId === viewerId);
  const isCaptain = viewer?.isCaptain === true;
  const isMember = !!viewer;
  const monogram =
    team.name
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of team.games) {
    if (g.scoreHome === null || g.scoreAway === null) continue;
    if (g.scoreHome > g.scoreAway) wins++;
    else if (g.scoreHome < g.scoreAway) losses++;
    else draws++;
  }
  const points = wins * 3 + draws;
  const teamColor = getTeamColor(team.color);

  const membersWithStats = await Promise.all(
    team.members.map(async (m) => ({
      ...m,
      stats: await getPlayerStats(m.userId),
    })),
  );

  return (
    <>
      {/* Pitch-gradient header */}
      <div
        className="relative h-[128px] overflow-hidden"
        style={{ background: "linear-gradient(150deg,#1c7a45,#0f5530)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 46px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.55))",
          }}
        />
        <div className="absolute top-0 left-0 right-0">
          <StatusBar />
        </div>
        <div className="absolute top-[52px] left-[22px] text-white [&_button]:bg-black/45 [&_button]:border-white/40">
          <BackButton href={`/${locale}/teams`} />
        </div>
      </div>

      <div className="px-6 pb-28">
        {/* Logo overlaps the pitch header like a badge; name/subtitle sit cleanly
            below so they render on the page background in both themes.
            `relative z-10` forces the badge above the pitch header's own
            stacking context so it isn't clipped. */}
        <div
          className="relative z-10 w-[72px] h-[72px] rounded-[20px] flex items-center justify-center font-display font-extrabold text-[22px] text-[var(--primary-text)] -mt-[18px]"
          style={{
            background: `linear-gradient(140deg, ${teamColor.base}, ${teamColor.edge})`,
            border: "3px solid var(--bg)",
          }}
        >
          {monogram}
        </div>
        <div className="mt-3">
          <div className="font-display font-extrabold text-[22px] truncate text-text">
            {team.name}
          </div>
          <div className="text-[13px] text-text-muted font-semibold mt-1 truncate">
            {team.district ?? "—"} ·{" "}
            {t("teams.members_count", { count: team.members.length })}
          </div>
        </div>

        {/* Win/loss/points */}
        <div className="flex gap-2.5 mt-[18px]">
          <Stat value={wins.toString()} label={t("teams.wins")} valueColor="text-primary-soft" />
          <Stat value={losses.toString()} label={t("teams.losses")} />
          <Stat
            value={points.toString()}
            label={t("teams.points")}
            valueColor="text-warning"
          />
        </div>

        <div className="font-display font-bold text-[15px] mt-5 mb-3">{t("teams.roster")}</div>
        <div className="flex flex-col gap-2.5">
          {membersWithStats.map((m) => {
            const tier = attendanceTier(m.stats.attendanceRate);
            const isViewer = m.userId === viewerId;
            return (
              <Link
                key={m.id}
                href={`/${locale}/players/${m.user.id}`}
                className="flex items-center gap-3 bg-surface border border-border rounded-[14px] px-3.5 py-3"
              >
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-display font-extrabold text-[13px] text-[var(--primary-text)] shrink-0"
                  style={{ background: "var(--primary)" }}
                >
                  {initials(m.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14.5px] truncate">
                      {m.user.name}
                      {isViewer && (
                        <span className="text-text-muted font-normal ml-1.5">
                          {t("teams.you_paren")}
                        </span>
                      )}
                    </span>
                    {m.isCaptain && (
                      <span
                        className="px-[7px] py-0.5 rounded-md text-[10px] font-display font-extrabold text-warning"
                        style={{ background: "rgba(242,181,60,.15)" }}
                      >
                        {t("teams.captain_badge")}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-text-muted mt-0.5">
                    {m.user.position ? t(`positions.${m.user.position}`) : "—"}
                  </div>
                </div>
                <span
                  className="font-display font-extrabold text-[12.5px] shrink-0"
                  style={{ color: ATT_COLOR[tier] }}
                >
                  {m.stats.attendanceRate === null
                    ? "—"
                    : `${m.stats.attendanceRate}%`}
                </span>
                {isCaptain && !m.isCaptain && (
                  <RemoveMemberButton
                    teamId={team.id}
                    memberUserId={m.user.id}
                    memberName={m.user.name}
                    locale={locale}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className="fixed bottom-20 inset-x-0 z-30 px-6 pt-4 pb-4"
        style={{
          background:
            "linear-gradient(180deg, transparent, var(--bg) 28%)",
        }}
      >
        <TeamActions
          teamId={team.id}
          locale={locale}
          isMember={isMember}
          isCaptain={isCaptain}
        />
      </div>
    </>
  );
}

function Stat({
  value,
  label,
  valueColor = "text-text",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 bg-surface border border-border rounded-2xl py-3 text-center">
      <div className={`font-display font-extrabold text-[22px] ${valueColor}`}>
        {value}
      </div>
      <div className="text-[11.5px] text-text-muted mt-1">{label}</div>
    </div>
  );
}
