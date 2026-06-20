import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { Avatar } from "@/components/avatar/Avatar";
import { teamGradient } from "@/lib/team-color";

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

export default async function PlayerPublicProfile({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const viewerId = session!.user.id;

  const player = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      position: true,
      district: true,
      skillLevel: true,
      age: true,
      isOpenToInvite: true,
      createdAt: true,
      teamMemberships: {
        include: { team: { select: { id: true, name: true, district: true, color: true } } },
      },
    },
  });
  if (!player) notFound();
  if (player.id === viewerId) {
    return (
      <>
        <StatusBar />
        <div className="px-6 pt-4 flex items-center gap-4">
          <BackButton href={`/${locale}/players`} />
        </div>
        <div className="px-7 pt-10 text-center text-text-muted">
          {t("profile.this_is_you")}{" "}
          <Link href={`/${locale}/profile`} className="text-primary font-bold">
            {t("profile.view_my")}
          </Link>
        </div>
      </>
    );
  }

  const stats = await getPlayerStats(player.id);
  const attendancePct = stats.attendanceRate ?? 0;

  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-3.5 px-6 pt-4">
        <BackButton href={`/${locale}/players`} />
        <div className="font-display font-extrabold text-[18px]">
          {t("players.profile_title")}
        </div>
      </div>

      <div className="px-6 pt-[18px] pb-32">
        <div className="flex items-center gap-4">
          <Avatar
            name={player.name}
            seed={player.id}
            src={player.avatar}
            size={74}
          />
          <div className="flex-1 min-w-0">
            <div className="font-display font-extrabold text-[22px] tracking-tight truncate">
              {player.name}
            </div>
            <div className="text-[13.5px] text-[#9aa39d] font-semibold mt-1">
              {player.position ? t(`positions.${player.position}`) : "—"}
              {player.district && ` · ${player.district}`}
              {player.age && ` · ` + t("players.age_years", { age: player.age })}
            </div>
          </div>
        </div>

        {player.isOpenToInvite ? (
          <div className="mt-3.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-primary/10 border border-primary/30">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[13.5px] font-bold text-primary-soft">
              {t("players.open_invites")}
            </span>
          </div>
        ) : (
          <div className="mt-3.5 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[13.5px] font-bold text-text-muted">
            {t("players.closed_to_invites")}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 mt-4">
          <div className="basis-[58%] bg-surface border border-border rounded-[18px] p-4">
            <div className="text-[12px] text-text-muted font-semibold">
              {t("players.attendance")}
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
              {t("players.attendance_detail", { played: stats.gamesPlayed, total: stats.totalJoined })}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="flex-1 bg-surface border border-border rounded-[18px] p-3.5">
              <div className="text-[12px] text-text-muted font-semibold">
                {t("players.played")}
              </div>
              <div className="font-display font-extrabold text-[26px] mt-1">
                {stats.gamesPlayed}
              </div>
            </div>
            <div className="flex-1 bg-surface border border-border rounded-[18px] p-3.5">
              <div className="text-[12px] text-text-muted font-semibold">
                {t("players.joined_stat")}
              </div>
              <div className="font-display font-extrabold text-[26px] mt-1">
                {stats.totalJoined}
              </div>
            </div>
          </div>
        </div>

        {player.teamMemberships.length > 0 && (
          <>
            <div className="font-display font-bold text-[15px] mt-5 mb-3">
              {t("players.teams_label")}
            </div>
            <div className="flex flex-col gap-2.5">
              {player.teamMemberships.map((tm) => (
                <Link
                  key={tm.id}
                  href={`/${locale}/teams/${tm.team.id}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded-[14px] px-3.5 py-3"
                >
                  <div
                    className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center font-display font-extrabold text-[13px] text-[#06210F]"
                    style={{ background: teamGradient(tm.team.color) }}
                  >
                    {tm.team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14.5px] truncate">
                      {tm.team.name}
                    </div>
                    <div className="text-[12px] text-text-muted mt-0.5">
                      {tm.team.district ?? "—"}
                      {tm.isCaptain && ` · ` + t("teams.captain_full")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className="fixed bottom-20 inset-x-0 z-30 px-6 pt-4 pb-4 flex gap-2.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,14,13,0), #0B0E0D 28%)",
        }}
      >
        <Link
          href={`/${locale}/players`}
          className="flex-1 h-14 rounded-2xl bg-transparent text-text font-display font-bold text-[15px] flex items-center justify-center gap-2"
          style={{ border: "1.5px solid rgba(255,255,255,.16)" }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          {t("players.others_label")}
        </Link>
        {player.isOpenToInvite ? (
          <Link
            href={`/${locale}/players/${player.id}/invite`}
            className="flex-[1.3] h-14 rounded-2xl bg-primary text-primary-text font-display font-extrabold text-[16px] flex items-center justify-center"
          >
            {t("players.invite_to_game")}
          </Link>
        ) : (
          <div className="flex-[1.3] h-14 rounded-2xl border border-white/10 text-text-muted font-display font-bold text-[14px] flex items-center justify-center">
            {t("players.closed_btn")}
          </div>
        )}
      </div>
    </>
  );
}
