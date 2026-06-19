import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AttendanceBadge } from "@/components/ui/AttendanceBadge";
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

export function PlayerCard({ player }: { player: PlayerCardData }) {
  const locale = useLocale();
  const t = useTranslations();
  return (
    <Link
      href={`/${locale}/players/${player.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border active:scale-[0.99] transition-transform"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-display font-extrabold text-[14px] text-[#06210F] shrink-0"
        style={{
          background: `linear-gradient(140deg, hsl(${hue(player.id)} 70% 55%), hsl(${
            (hue(player.id) + 30) % 360
          } 70% 40%))`,
        }}
      >
        {initials(player.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-display font-bold text-[15px] truncate">{player.name}</div>
          {!player.isOpenToInvite && (
            <span className="text-text-muted text-[11px]">занят</span>
          )}
        </div>
        <div className="text-text-muted text-[12.5px] mt-0.5 truncate">
          {player.position ? t(`positions.${player.position}`) : "—"}
          {player.district && ` · ${player.district}`}
          {" · "}
          {player.gamesPlayed} {player.gamesPlayed === 1 ? "игра" : "игр"}
        </div>
      </div>
      <AttendanceBadge rate={player.attendanceRate} />
    </Link>
  );
}
