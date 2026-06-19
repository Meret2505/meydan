"use client";

import { useTransition } from "react";
import { cancelTournament } from "@/app/actions/tournaments";

export function CancelTournamentButton({
  tournamentId,
  locale,
}: {
  tournamentId: string;
  locale: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Отменить турнир? Это пометит его как отменённый.")) return;
        startTransition(() => cancelTournament(tournamentId, locale));
      }}
      className="w-full h-12 rounded-xl border border-danger/40 text-danger font-display font-bold text-[14px] disabled:opacity-50"
    >
      Отменить турнир
    </button>
  );
}
