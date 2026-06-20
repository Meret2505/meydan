"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
        title={t("teams.remove_member_title", { name: memberName })}
        description={t("teams.remove_member_desc")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.back")}
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
