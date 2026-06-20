"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { invitePlayerToGame } from "@/app/actions/invites";

export function InviteButton({
  gameId,
  receiverId,
  locale,
}: {
  gameId: string;
  receiverId: string;
  locale: string;
}) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => invitePlayerToGame(gameId, receiverId, locale))
      }
      className="h-10 px-4 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] disabled:opacity-50"
    >
      {isPending ? "..." : t("players.invite")}
    </button>
  );
}
