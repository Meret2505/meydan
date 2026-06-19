"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { saveAge, skipAge } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {label}
    </Button>
  );
}

export function AgeForm({
  ranges,
  initial,
  finishLabel,
  skipLabel,
}: {
  ranges: { label: string; mid: number }[];
  initial: number | null;
  finishLabel: string;
  skipLabel: string;
}) {
  const locale = useLocale();
  const [age, setAge] = useState<number | null>(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <form action={saveAge} className="flex flex-col flex-1 px-7 pt-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="age" value={age ?? ""} />
      <div className="grid grid-cols-2 gap-3.5">
        {ranges.map((r) => {
          const active = age === r.mid;
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => setAge(r.mid)}
              className={cn(
                "h-16 rounded-2xl border flex items-center justify-center font-display font-bold text-[19px]",
                active
                  ? "bg-primary/8 border-primary text-primary"
                  : "bg-surface border-white/10 text-text",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="pb-12 flex flex-col gap-2.5">
        <Submit label={finishLabel} disabled={!age} />
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => skipAge(locale))}
          className="h-11 rounded-xl text-text-muted font-sans font-semibold text-[15px] disabled:opacity-50"
        >
          {skipLabel}
        </button>
      </div>
    </form>
  );
}
