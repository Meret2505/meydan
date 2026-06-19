"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
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
  const [isPending, startTransition] = useTransition();

  if (isCompleted) {
    return (
      <Button type="button" variant="secondary" disabled>
        Игра завершена
      </Button>
    );
  }

  if (isPast) {
    return (
      <Link
        href={`/${locale}/games/${gameId}/result`}
        className="h-[58px] w-full rounded-lg bg-primary text-primary-text font-display font-extrabold text-[17px] flex items-center justify-center"
      >
        Внести результат
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Отменить игру? Игроки получат уведомление.")) return;
        startTransition(() => cancelGame(gameId, locale));
      }}
      className="w-full h-[58px] rounded-lg border border-danger/40 text-danger font-display font-bold text-[15px] disabled:opacity-50"
    >
      Отменить игру
    </button>
  );
}
