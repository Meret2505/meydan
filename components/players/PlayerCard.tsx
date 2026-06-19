import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { attendanceTier } from "@/lib/stats";
import type { Position, SkillLevel } from "@prisma/client";

export interface PlayerCardData {
  id: string;
  name: string;
  position: Position | null;
  skillLevel: SkillLevel;
  district: string | null;
  attendanceRate: number | null;
  gamesPlayed: number;
  isOpenToInvite: boolean;
}

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
      : `явка ${player.attendanceRate}%`;
  return (
    <div className="bg-surface border border-border rounded-[18px] p-3.5">
      <div className="flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-display font-extrabold text-[17px] text-[#06210F] shrink-0"
          style={{
            background: `linear-gradient(140deg, hsl(${hue(player.id)} 70% 55%), hsl(${
              (hue(player.id) + 30) % 360
            } 70% 40%))`,
          }}
        >
          {initials(player.name)}
        </div>
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
              · {player.gamesPlayed} игр
            </span>
          </div>
        </div>
        {player.isOpenToInvite ? (
          <Link
            href={`/${locale}/players/${player.id}`}
            className="h-[38px] px-[15px] rounded-[11px] bg-primary text-primary-text font-display font-extrabold text-[13px] inline-flex items-center"
          >
            Пригласить
          </Link>
        ) : (
          <span className="px-2.5 py-1 rounded-md bg-white/5 text-text-muted text-[11px] font-bold">
            закрыт
          </span>
        )}
      </div>
      <Link
        href={`/${locale}/players/${player.id}`}
        className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between"
      >
        <span className="text-[12.5px] font-bold text-text-muted">
          Открыть профиль и историю
        </span>
        <span className="text-text-muted text-[16px]">›</span>
      </Link>
    </div>
  );
}
