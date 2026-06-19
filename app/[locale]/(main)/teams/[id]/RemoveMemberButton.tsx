"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { removeMember } from "@/app/actions/teams";

export function RemoveMemberButton({
  teamId,
  memberUserId,
  memberName,
  locale,
}: {
  teamId: string;
  memberUserId: string;
  memberName: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="remove"
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-text-muted shrink-0"
      >
        ✕
      </button>
      <ConfirmDialog
        open={open}
        title={`Удалить ${memberName}?`}
        description="Игрок будет исключён из состава команды. Он сможет вернуться позже."
        confirmLabel="Удалить"
        cancelLabel="Назад"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(() => removeMember(teamId, memberUserId, locale))
        }
      />
    </>
  );
}
