"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { joinGame, leaveGame } from "@/app/actions/games";

export function JoinLeaveButton({
  gameId,
  joined,
  locale,
  disabled,
  label,
  variant,
}: {
  gameId: string;
  joined: boolean;
  locale: string;
  disabled: boolean;
  label: string;
  variant: "primary" | "secondary";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={isPending || disabled}
      onClick={() =>
        startTransition(() =>
          joined ? leaveGame(gameId, locale) : joinGame(gameId, locale),
        )
      }
    >
      {label}
    </Button>
  );
}
