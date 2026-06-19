"use client";

import { useTransition } from "react";
import { removeMember } from "@/app/actions/teams";

export function RemoveMemberButton({
  teamId,
  memberUserId,
  locale,
}: {
  teamId: string;
  memberUserId: string;
  locale: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Удалить игрока из команды?")) return;
        startTransition(() => removeMember(teamId, memberUserId, locale));
      }}
      aria-label="remove"
      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-text-muted shrink-0 disabled:opacity-50"
    >
      ✕
    </button>
  );
}
