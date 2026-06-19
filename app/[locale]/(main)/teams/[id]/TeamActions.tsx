"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
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
  const [isPending, startTransition] = useTransition();

  if (isCaptain) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Расформировать команду? Действие необратимо.")) return;
          startTransition(() => disbandTeam(teamId, locale));
        }}
        className="w-full h-12 rounded-xl border border-danger/40 text-danger font-display font-bold text-[14px] disabled:opacity-50"
      >
        Расформировать команду
      </button>
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
