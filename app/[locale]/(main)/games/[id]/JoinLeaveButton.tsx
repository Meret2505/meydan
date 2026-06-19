"use client";

import { useTransition } from "react";
import { joinGame, leaveGame } from "@/app/actions/games";
import { cn } from "@/lib/utils";

interface Props {
  gameId: string;
  joined: boolean;
  locale: string;
  disabled: boolean;
  label: string;
  variant: "primary" | "joined";
}

export function JoinLeaveButton({
  gameId,
  joined,
  locale,
  disabled,
  label,
  variant,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const styles =
    variant === "joined"
      ? "bg-[#1A201E] text-primary-soft border border-primary/30"
      : "bg-primary text-primary-text";

  return (
    <button
      type="button"
      disabled={isPending || disabled}
      onClick={() =>
        startTransition(() =>
          joined ? leaveGame(gameId, locale) : joinGame(gameId, locale),
        )
      }
      className={cn(
        "w-full h-[58px] rounded-2xl font-display font-extrabold text-[16px] disabled:opacity-60",
        styles,
      )}
    >
      {label}
    </button>
  );
}
