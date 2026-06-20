"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-xl border border-danger/40 text-danger font-display font-bold text-[14px]"
      >
        {t("tournaments.cancel_tournament")}
      </button>
      <ConfirmDialog
        open={open}
        title={t("tournaments.cancel_confirm_title")}
        description={t("tournaments.cancel_confirm_desc")}
        confirmLabel={t("tournaments.cancel_tournament")}
        cancelLabel={t("common.back")}
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => cancelTournament(tournamentId, locale))}
      />
    </>
  );
}
