import Link from "next/link";
import { useLocale } from "next-intl";

export interface TeamCardData {
  id: string;
  name: string;
  district: string | null;
  memberCount: number;
  captainName: string | null;
}

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function TeamCard({ team }: { team: TeamCardData }) {
  const locale = useLocale();
  const monogram = team.name.slice(0, 2).toUpperCase();
  return (
    <Link
      href={`/${locale}/teams/${team.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border active:scale-[0.99] transition-transform"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-extrabold text-[16px] text-[#06210F] shrink-0"
        style={{
          background: `linear-gradient(140deg, hsl(${hue(team.id)} 70% 55%), hsl(${
            (hue(team.id) + 30) % 360
          } 70% 40%))`,
        }}
      >
        {monogram}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-extrabold text-[16px] truncate">{team.name}</div>
        <div className="text-text-muted text-[12.5px] mt-0.5 truncate">
          {team.district ?? "—"}
          {team.captainName && ` · капитан ${team.captainName}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display font-extrabold text-[18px]">
          {team.memberCount}
        </div>
        <div className="text-text-muted text-[11px]">в составе</div>
      </div>
    </Link>
  );
}
