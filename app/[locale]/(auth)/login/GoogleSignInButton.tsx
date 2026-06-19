"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { googleSignIn } from "@/app/actions/auth";

export function GoogleSignInButton({ label }: { label: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => googleSignIn(locale))}
      className="h-[58px] rounded-lg bg-[#F2F5F3] text-[#0B0E0D] font-sans font-bold text-[16.5px] flex items-center justify-center gap-3 disabled:opacity-60"
    >
      <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-display font-black text-[15px] text-[#4285F4] border border-[#e3e6e3]">
        G
      </span>
      {label}
    </button>
  );
}
