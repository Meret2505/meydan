import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { teamGradient } from "@/lib/team-color";

export default async function TeamsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const userId = session!.user.id;

  const myTeams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, games: true } },
      members: {
        where: { isCaptain: true },
        include: { user: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  const myTeamIds = new Set(myTeams.map((t) => t.id));

  const others = await prisma.team.findMany({
    where: { id: { notIn: Array.from(myTeamIds) } },
    include: {
      _count: { select: { members: true, games: true } },
    },
    orderBy: [{ games: { _count: "desc" } }, { members: { _count: "desc" } }],
    take: 30,
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-24">
        <div className="font-display font-extrabold text-[25px]">
          {t("nav.teams")}
        </div>

        <div className="text-[13px] font-bold text-text-muted mt-5 mb-3">
          Мои команды
        </div>

        {myTeams.length === 0 ? (
          <div className="bg-surface border border-border rounded-[18px] p-5 text-center">
            <div className="text-text-muted text-[13.5px]">
              Вы пока не состоите в команде.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myTeams.map((team, i) => {
              const captain = team.members[0]?.user.name;
              return (
                <Link
                  key={team.id}
                  href={`/${locale}/teams/${team.id}`}
                  className="flex items-center gap-3.5 bg-surface border border-border rounded-[18px] p-[15px]"
                >
                  <div
                    className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center font-display font-extrabold text-[16px] text-[#06210F] shrink-0"
                    style={{ background: teamGradient(team.color) }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[16px] truncate">
                      {team.name}
                    </div>
                    <div className="text-[12.5px] text-text-muted mt-0.5 truncate">
                      {team.district ?? "—"} · {team._count.members} в составе
                      {captain && ` · кап. ${captain.split(" ")[0]}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-extrabold text-[17px] text-warning">
                      #{i + 1}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      в рейтинге
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Link
          href={`/${locale}/teams/create`}
          className="mt-3 h-[50px] rounded-[14px] flex items-center justify-center text-text-soft font-sans font-bold text-[14.5px]"
          style={{
            border: "1.5px dashed rgba(255,255,255,.16)",
            background: "transparent",
          }}
        >
          + Создать команду
        </Link>

        {others.length > 0 && (
          <>
            <div className="text-[13px] font-bold text-text-muted mt-6 mb-3">
              Команды города
            </div>
            <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
              {others.map((team, i) => (
                <Link
                  key={team.id}
                  href={`/${locale}/teams/${team.id}`}
                  className="flex items-center gap-3 px-4 py-[13px] border-b border-white/[0.04] last:border-0"
                >
                  <span className="font-display font-extrabold text-[14px] text-text-muted w-4">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-semibold text-[14.5px] truncate">
                    {team.name}
                  </span>
                  <span className="font-display font-extrabold text-[15px] text-primary">
                    {team._count.games}
                  </span>
                </Link>
              ))}
            </div>
            <div className="text-center text-text-muted text-[11.5px] mt-2">
              Число — сыгранных матчей
            </div>
          </>
        )}
      </div>
    </>
  );
}
