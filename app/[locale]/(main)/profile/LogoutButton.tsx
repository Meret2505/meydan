"use client";

import { useTransition } from "react";
import { logOut } from "@/app/actions/profile";

export function LogoutButton({ locale }: { locale: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logOut(locale))}
      className="h-12 rounded-xl border border-danger/40 text-danger font-sans font-semibold text-[15px] disabled:opacity-50"
    >
      Выйти
    </button>
  );
}
