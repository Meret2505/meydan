"use client";

import { useTransition } from "react";
import {
  registerTeamForTournament,
  unregisterTeamFromTournament,
} from "@/app/actions/tournaments";

export function RegisterTeamControls({
  tournamentId,
  locale,
  myTeams,
}: {
  tournamentId: string;
  locale: string;
  myTeams: { id: string; name: string; registered: boolean }[];
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border">
      <div className="text-text-muted text-[11.5px] uppercase tracking-wide font-display font-bold">
        Ваши команды
      </div>
      {myTeams.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg border border-border"
        >
          <span className="font-display font-bold text-[13.5px]">{t.name}</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                t.registered
                  ? unregisterTeamFromTournament(tournamentId, t.id, locale)
                  : registerTeamForTournament(tournamentId, t.id, locale),
              )
            }
            className={
              t.registered
                ? "px-3 h-8 rounded-lg border border-white/10 text-text-muted font-display font-bold text-[12px]"
                : "px-3 h-8 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[12px]"
            }
          >
            {t.registered ? "Снять" : "Записать"}
          </button>
        </div>
      ))}
    </div>
  );
}
