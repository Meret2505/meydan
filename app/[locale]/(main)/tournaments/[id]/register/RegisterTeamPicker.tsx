"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  registerTeamForTournament,
  unregisterTeamFromTournament,
} from "@/app/actions/tournaments";
import { teamGradient } from "@/lib/team-color";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  district: string | null;
  color: string | null;
  members: number;
  registered: boolean;
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function RegisterTeamPicker({
  tournamentId,
  locale,
  teams,
}: {
  tournamentId: string;
  locale: string;
  teams: Team[];
}) {
  const t = useTranslations();
  const [picked, setPicked] = useState<string | null>(
    teams.find((team) => team.registered)?.id ?? teams[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5 text-center">
        <div className="font-display font-extrabold text-[16px]">
          {t("tournaments.no_teams_captain")}
        </div>
        <p className="text-text-muted text-[13.5px] mt-2 leading-relaxed">
          {t("tournaments.no_teams_captain_sub")}
        </p>
        <Link
          href={`/${locale}/teams/create`}
          className="mt-3.5 inline-flex h-10 px-4 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] items-center"
        >
          {t("teams.create_team")}
        </Link>
      </div>
    );
  }

  const pickedTeam = teams.find((team) => team.id === picked) ?? null;

  return (
    <>
      <div>
        <div className="text-[13px] font-bold text-text-muted mb-2.5">{t("tournaments.team_label")}</div>
        <div className="flex flex-col gap-2">
          {teams.map((team) => {
            const active = picked === team.id;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setPicked(team.id)}
                className={cn(
                  "flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border-[1.5px] text-left",
                  active ? "border-primary" : "border-border",
                )}
              >
                <div
                  className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center font-display font-extrabold text-[15px] text-[#06210F]"
                  style={{ background: teamGradient(team.color) }}
                >
                  {monogram(team.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[15px] truncate">
                    {team.name}
                  </div>
                  <div className="text-text-muted text-[12.5px] mt-0.5">
                    {t("tournaments.you_captain")} ·{" "}
                    {t("tournaments.players_count", { count: team.members })}
                  </div>
                </div>
                {active && (
                  <span className="text-primary font-display font-extrabold text-[17px]">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 px-6 pb-4 pt-3 bg-gradient-to-t from-bg via-bg/95 to-transparent z-30">
        {pickedTeam?.registered ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                unregisterTeamFromTournament(tournamentId, pickedTeam.id, locale),
              )
            }
            className="w-full h-[58px] rounded-[16px] border-[1.5px] border-danger/40 text-danger font-display font-extrabold text-[16px] disabled:opacity-50"
          >
            {t("tournaments.withdraw_application")}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending || !pickedTeam}
            onClick={() =>
              pickedTeam &&
              startTransition(() =>
                registerTeamForTournament(tournamentId, pickedTeam.id, locale),
              )
            }
            className="w-full h-[58px] rounded-[16px] bg-primary text-primary-text font-display font-extrabold text-[17px] disabled:opacity-50"
          >
            {t("tournaments.submit_application")}
          </button>
        )}
      </div>
    </>
  );
}
