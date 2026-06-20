"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { disbandTeam, joinTeam, leaveTeam } from "@/app/actions/teams";

export function TeamActions({
  teamId,
  locale,
  isMember,
  isCaptain,
}: {
  teamId: string;
  locale: string;
  isMember: boolean;
  isCaptain: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isCaptain) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-xl border border-danger/40 text-danger font-display font-bold text-[14px]"
        >
          {t("teams.disband")}
        </button>
        <ConfirmDialog
          open={open}
          title={t("teams.disband_confirm_title")}
          description={t("teams.disband_confirm_desc")}
          confirmLabel={t("teams.disband")}
          cancelLabel={t("common.back")}
          destructive
          isPending={isPending}
          onCancel={() => setOpen(false)}
          onConfirm={() => startTransition(() => disbandTeam(teamId, locale))}
        />
      </>
    );
  }

  if (isMember) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => startTransition(() => leaveTeam(teamId, locale))}
      >
        {t("teams.leave")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => joinTeam(teamId, locale))}
    >
      {t("teams.join")}
    </Button>
  );
}
