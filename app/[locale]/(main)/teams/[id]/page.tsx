import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { AttendanceBadge } from "@/components/ui/AttendanceBadge";
import { TeamActions } from "./TeamActions";
import { RemoveMemberButton } from "./RemoveMemberButton";

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function TeamDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
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
      _count: { select: { games: true } },
    },
  });
  if (!team) notFound();

  const viewer = team.members.find((m) => m.userId === viewerId);
  const isCaptain = viewer?.isCaptain === true;
  const isMember = !!viewer;
  const monogram = team.name.slice(0, 2).toUpperCase();

  const membersWithStats = await Promise.all(
    team.members.map(async (m) => ({
      ...m,
      stats: await getPlayerStats(m.userId),
    })),
  );

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/teams`} />
      </div>

      <div className="px-7 pt-6 flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center font-display font-extrabold text-[28px] text-[#06210F]"
          style={{
            background: `linear-gradient(140deg, hsl(${hue(team.id)} 70% 55%), hsl(${
              (hue(team.id) + 30) % 360
            } 70% 40%))`,
          }}
        >
          {monogram}
        </div>
        <div className="mt-4 font-display font-extrabold text-[26px] tracking-tight">
          {team.name}
        </div>
        <div className="mt-1 text-text-muted text-[14px]">
          {team.district ?? "—"} · {team.members.length} в составе · {team._count.games} матчей
        </div>
      </div>

      <div className="px-6 pt-6">
        <div className="text-text-muted text-[12.5px] font-bold uppercase tracking-wide mb-3">
          Состав
        </div>
        <div className="flex flex-col gap-2">
          {membersWithStats.map((m) => (
            <Link
              key={m.id}
              href={`/${locale}/players/${m.user.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-display font-extrabold text-[12px] text-[#06210F] shrink-0"
                style={{
                  background: `linear-gradient(140deg, hsl(${hue(m.user.id)} 70% 55%), hsl(${
                    (hue(m.user.id) + 30) % 360
                  } 70% 40%))`,
                }}
              >
                {initials(m.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[14.5px] truncate">
                    {m.user.name}
                  </span>
                  {m.isCaptain && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-display font-extrabold uppercase">
                      C
                    </span>
                  )}
                </div>
                <div className="text-text-muted text-[12px]">
                  {m.user.position ? t(`positions.${m.user.position}`) : "—"}
                </div>
              </div>
              <AttendanceBadge rate={m.stats.attendanceRate} />
              {isCaptain && !m.isCaptain && (
                <RemoveMemberButton
                  teamId={team.id}
                  memberUserId={m.user.id}
                  locale={locale}
                />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 pt-6 pb-28">
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
