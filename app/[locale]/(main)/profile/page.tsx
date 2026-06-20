import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { Avatar } from "@/components/avatar/Avatar";
import { gameFormat } from "@/lib/game-format";
import { LogoutButton } from "./LogoutButton";

export default async function ProfilePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const [t, session] = await Promise.all([getTranslations(), getSession()]);
  const userId = session!.user.id;
  const [user, stats, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getPlayerStats(userId),
    prisma.gameParticipant.findMany({
      where: { userId, game: { status: "COMPLETED" } },
      include: {
        game: {
          include: { field: { select: { name: true } } },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 3,
    }),
  ]);
  if (!user) return null;

  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const positionLabel = user.position ? t(`positions.${user.position}`) : "—";
  const attendancePct = stats.attendanceRate ?? 0;

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-3.5 pb-24">
        {/* Header avatar + name */}
        <div className="flex items-center gap-4">
          <Avatar
            name={user.name}
            seed={user.id}
            src={user.avatar}
            size={74}
          />

          <div className="flex-1 min-w-0">
            <div className="font-display font-extrabold text-[22px] tracking-tight truncate">
              {user.name}
            </div>
            <div className="text-[13.5px] text-[#9aa39d] font-semibold mt-1">
              {positionLabel} · {user.district ?? "—"}
            </div>
          </div>
        </div>

        {/* Open-to-invites pill */}
        <div
          className={`mt-3.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl ${
            user.isOpenToInvite
              ? "bg-primary/10 border border-primary/30"
              : "bg-white/5 border border-white/10"
          }`}
        >
          <div className="relative w-[34px] h-5 rounded-full shrink-0">
            <div
              className={`absolute inset-0 rounded-full transition-colors ${
                user.isOpenToInvite ? "bg-primary" : "bg-white/15"
              }`}
            />
            <div
              className={`absolute top-[2px] w-4 h-4 rounded-full bg-[#06210F] transition-all ${
                user.isOpenToInvite ? "right-[2px]" : "left-[2px]"
              }`}
            />
          </div>
          <span
            className={`text-[13.5px] font-bold ${
              user.isOpenToInvite ? "text-primary-soft" : "text-text-muted"
            }`}
          >
            {user.isOpenToInvite
              ? t("profile.open_invites")
              : t("profile.closed_invites")}
          </span>
        </div>

        {/* Stats grid */}
        <div className="flex gap-3 mt-4">
          <div className="basis-[58%] bg-surface border border-border rounded-[18px] p-4">
            <div className="text-[12px] text-text-muted font-semibold">
              {t("profile.attendance")}
            </div>
            <div className="font-display font-black text-[38px] text-primary leading-none mt-1.5">
              {stats.attendanceRate === null ? "—" : stats.attendanceRate}
              {stats.attendanceRate !== null && (
                <span className="text-[20px]">%</span>
              )}
            </div>
            <div className="h-1.5 rounded bg-white/8 overflow-hidden mt-3">
              <div
                className="h-full bg-primary rounded"
                style={{ width: `${attendancePct}%` }}
              />
            </div>
            <div className="text-[11.5px] text-[#6e756f] mt-2">
              {t("profile.attendance_detail", {
                played: stats.gamesPlayed,
                total: stats.totalJoined,
              })}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="flex-1 bg-surface border border-border rounded-[18px] p-3.5">
              <div className="text-[12px] text-text-muted font-semibold">
                {t("profile.played")}
              </div>
              <div className="font-display font-extrabold text-[26px] mt-1">
                {stats.gamesPlayed}
              </div>
            </div>
            <div className="flex-1 bg-surface border border-border rounded-[18px] p-3.5">
              <div className="text-[12px] text-text-muted font-semibold">
                {t("profile.joined_stat")}
              </div>
              <div className="font-display font-extrabold text-[26px] mt-1">
                {stats.totalJoined}
              </div>
            </div>
          </div>
        </div>

        {/* Recent games */}
        {recent.length > 0 && (
          <>
            <div className="font-display font-bold text-[15px] mt-5 mb-3">
              {t("profile.recent_games")}
            </div>
            <div className="flex flex-col gap-2.5">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  href={`/${locale}/games/${p.gameId}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded-[14px] px-3.5 py-3"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-[13px] ${
                      p.attended === true
                        ? "bg-primary/15 text-primary-soft"
                        : "bg-white/5 text-text-soft"
                    }`}
                  >
                    {p.game.scoreHome !== null && p.game.scoreAway !== null
                      ? `${p.game.scoreHome}:${p.game.scoreAway}`
                      : "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[14px] truncate">
                      {p.game.field?.name ?? p.game.fieldName ?? "—"}
                    </div>
                    <div className="text-[12px] text-text-muted mt-0.5">
                      {dateFmt.format(p.game.scheduledAt)} · {gameFormat(p.game)}
                    </div>
                  </div>
                  <span
                    className={`text-[12px] font-bold ${
                      p.attended === true
                        ? "text-primary-soft"
                        : p.attended === false
                        ? "text-danger"
                        : "text-text-muted"
                    }`}
                  >
                    {p.attended === true
                      ? t("profile.came")
                      : p.attended === false
                      ? t("profile.absent")
                      : "—"}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Settings */}
        <div className="font-display font-bold text-[15px] mt-5 mb-3">
          {t("profile.settings")}
        </div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8A938E"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
            </svg>
            <span className="flex-1 font-semibold text-[14.5px]">
              {t("profile.language")}
            </span>
            <LocaleToggle />
          </div>
          <Link
            href={`/${locale}/profile/edit`}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8A938E"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />
            </svg>
            <span className="flex-1 font-semibold text-[14.5px]">
              {t("profile.profile_contacts")}
            </span>
            <span className="text-text-muted text-[18px]">›</span>
          </Link>
          <LogoutButton locale={locale} logoutLabel={t("profile.logout_full")} />
        </div>
      </div>
    </>
  );
}
