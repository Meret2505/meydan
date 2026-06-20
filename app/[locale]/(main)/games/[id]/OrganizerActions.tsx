"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cancelGame } from "@/app/actions/games";

export function OrganizerActions({
  gameId,
  locale,
  isPast,
  isCompleted,
}: {
  gameId: string;
  locale: string;
  isPast: boolean;
  isCompleted: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isCompleted) {
    return (
      <Button type="button" variant="secondary" disabled>
        {t("games.completed")}
      </Button>
    );
  }

  if (isPast) {
    return (
      <Link
        href={`/${locale}/games/${gameId}/result`}
        className="h-[58px] w-full rounded-lg bg-primary text-primary-text font-display font-extrabold text-[17px] flex items-center justify-center"
      >
        {t("games.result")}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-[58px] rounded-lg border border-danger/40 text-danger font-display font-bold text-[15px]"
      >
        {t("games.cancel_game")}
      </button>
      <ConfirmDialog
        open={open}
        title={t("games.cancel_confirm_title")}
        description={t("games.cancel_confirm_desc")}
        confirmLabel={t("games.cancel_confirm_yes")}
        cancelLabel={t("common.back")}
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => cancelGame(gameId, locale))}
      />
    </>
  );
}
