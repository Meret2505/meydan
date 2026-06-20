import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { attendanceTier } from "@/lib/stats";
import { Avatar } from "@/components/avatar/Avatar";
import type { Position, SkillLevel } from "@prisma/client";

export interface PlayerCardData {
  id: string;
  name: string;
  avatar: string | null;
  position: Position | null;
  skillLevel: SkillLevel;
  district: string | null;
  attendanceRate: number | null;
  gamesPlayed: number;
  isOpenToInvite: boolean;
}

const ATT_COLOR: Record<ReturnType<typeof attendanceTier>, string> = {
  reliable: "#1FD16B",
  ok: "#F2B53C",
  poor: "#E0556A",
  new: "#8A938E",
};

export function PlayerCard({ player }: { player: PlayerCardData }) {
  const locale = useLocale();
  const t = useTranslations();
  const tier = attendanceTier(player.attendanceRate);
  const attLabel =
    tier === "new"
      ? t("attendance.new_player")
      : t("players.attendance_pct", { rate: player.attendanceRate });
  return (
    <div className="bg-surface border border-border rounded-[18px] p-3.5">
      <div className="flex items-center gap-3.5">
        <Avatar name={player.name} seed={player.id} src={player.avatar} size={48} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] truncate">{player.name}</div>
          <div className="text-[12.5px] text-text-muted mt-0.5 truncate">
            {player.position ? t(`positions.${player.position}`) : "—"}
            {player.district && ` · ${player.district}`}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="font-display font-extrabold text-[12.5px]"
              style={{ color: ATT_COLOR[tier] }}
            >
              {attLabel}
            </span>
            <span className="text-[12px] text-[#6e756f]">
              {` · ` + t("games.games_count", { count: player.gamesPlayed })}
            </span>
          </div>
        </div>
        {player.isOpenToInvite ? (
          <Link
            href={`/${locale}/players/${player.id}`}
            className="h-[38px] px-[15px] rounded-[11px] bg-primary text-primary-text font-display font-extrabold text-[13px] inline-flex items-center"
          >
            {t("players.invite_short")}
          </Link>
        ) : (
          <span className="px-2.5 py-1 rounded-md bg-white/5 text-text-muted text-[11px] font-bold">
            {t("players.closed_short")}
          </span>
        )}
      </div>
      <Link
        href={`/${locale}/players/${player.id}`}
        className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between"
      >
        <span className="text-[12.5px] font-bold text-text-muted">
          {t("players.open_profile")}
        </span>
        <span className="text-text-muted text-[16px]">›</span>
      </Link>
    </div>
  );
}
