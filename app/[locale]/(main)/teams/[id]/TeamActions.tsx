"use client";

import Link from "next/link";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isCaptain) {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Primary action: grow the team. */}
        <Link
          href={`/${locale}/players`}
          className="w-full h-12 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[15px] flex items-center justify-center"
        >
          {t("teams.find_players")}
        </Link>
        {/* Destructive action tucked away as a text link so it stops being
            the visual anchor of the page. Confirm dialog still gates it. */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-[12.5px] font-semibold text-danger"
        >
          {t("teams.disband")}
        </button>
        <ConfirmDialog
          open={confirmOpen}
          title={t("teams.disband_confirm_title")}
          description={t("teams.disband_confirm_desc")}
          confirmLabel={t("teams.disband")}
          cancelLabel={t("common.back")}
          destructive
          isPending={isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => startTransition(() => disbandTeam(teamId, locale))}
        />
      </div>
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
