"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { locales } from "@/i18n";

export function LocaleToggle() {
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(target: string) {
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as (typeof locales)[number])) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }
    const next = segments.join("/") || "/";
    startTransition(() => router.replace(next));
  }

  return (
    <div className="flex bg-white/5 border border-white/8 rounded-full p-[3px] font-display font-bold text-[12px]">
      {(["ru", "tm"] as const).map((loc) => {
        const active = current === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => !active && switchTo(loc)}
            disabled={isPending}
            className={cn(
              "px-3 py-1.5 rounded-full uppercase tracking-wide transition",
              active ? "bg-primary text-primary-text" : "text-text-muted",
            )}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
