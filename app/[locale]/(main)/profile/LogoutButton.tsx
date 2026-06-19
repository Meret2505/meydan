"use client";

import { useTransition } from "react";
import { logOut } from "@/app/actions/profile";

export function LogoutButton({
  locale,
  logoutLabel,
}: {
  locale: string;
  logoutLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logOut(locale))}
      className="w-full flex items-center gap-3 px-4 py-3.5 disabled:opacity-50"
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E0556A"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" />
        <path d="M9 12h12M18 9l3 3-3 3" />
      </svg>
      <span className="flex-1 text-left font-semibold text-[14.5px] text-danger">
        {logoutLabel}
      </span>
    </button>
  );
}
