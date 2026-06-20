import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { teamGradient } from "@/lib/team-color";

export interface TeamCardData {
  id: string;
  name: string;
  district: string | null;
  color: string | null;
  memberCount: number;
  captainName: string | null;
}

export function TeamCard({ team }: { team: TeamCardData }) {
  const locale = useLocale();
  const t = useTranslations();
  const monogram = team.name.slice(0, 2).toUpperCase();
  return (
    <Link
      href={`/${locale}/teams/${team.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border active:scale-[0.99] transition-transform"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-extrabold text-[16px] text-[#06210F] shrink-0"
        style={{ background: teamGradient(team.color) }}
      >
        {monogram}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-extrabold text-[16px] truncate">{team.name}</div>
        <div className="text-text-muted text-[12.5px] mt-0.5 truncate">
          {team.district ?? "—"}
          {team.captainName &&
            ` · ${t("teams.captain_short", { name: team.captainName })}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display font-extrabold text-[18px]">
          {team.memberCount}
        </div>
        <div className="text-text-muted text-[11px]">{t("teams.members")}</div>
      </div>
    </Link>
  );
}
