"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cancelTournament } from "@/app/actions/tournaments";

export function CancelTournamentButton({
  tournamentId,
  locale,
}: {
  tournamentId: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-xl border border-danger/40 text-danger font-display font-bold text-[14px]"
      >
        Отменить турнир
      </button>
      <ConfirmDialog
        open={open}
        title="Отменить турнир?"
        description="Турнир пометится как отменённый. Команды и матчи останутся видны."
        confirmLabel="Отменить"
        cancelLabel="Назад"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => cancelTournament(tournamentId, locale))}
      />
    </>
  );
}
