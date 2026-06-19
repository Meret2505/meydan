"use client";

import { useState, useTransition } from "react";
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
          Расформировать команду
        </button>
        <ConfirmDialog
          open={open}
          title="Расформировать команду?"
          description="Действие необратимо. Команда без матчей будет удалена."
          confirmLabel="Расформировать"
          cancelLabel="Назад"
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
        Выйти из команды
      </Button>
    );
  }

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => joinTeam(teamId, locale))}
    >
      Вступить в команду
    </Button>
  );
}
