"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { savePosition } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";
import type { Position } from "@prisma/client";

type Item = { value: Position; label: string; abbr: string; sub: string };

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {label}
    </Button>
  );
}

export function PositionForm({
  items,
  initial,
  nextLabel,
}: {
  items: Item[];
  initial: Position | null;
  nextLabel: string;
}) {
  const locale = useLocale();
  const [selected, setSelected] = useState<Position | null>(initial);

  return (
    <form action={savePosition} className="flex flex-col flex-1 px-7 pt-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="position" value={selected ?? ""} />
      <div className="grid grid-cols-2 gap-3.5">
        {items.map((p) => {
          const active = selected === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setSelected(p.value)}
              className={cn(
                "rounded-[20px] p-5 border text-left flex flex-col gap-3.5 min-h-[130px]",
                active
                  ? "border-primary bg-primary/8"
                  : "border-white/10 bg-surface",
              )}
            >
              <div
                className={cn(
                  "w-[46px] h-[46px] rounded-xl border flex items-center justify-center font-display font-extrabold text-[15px]",
                  active
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-white/5 border-white/10 text-text-muted",
                )}
              >
                {p.abbr}
              </div>
              <div>
                <div className="font-display font-bold text-[17px]">{p.label}</div>
                <div className="text-[13px] text-text-muted mt-1">{p.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="pb-12">
        <Submit label={nextLabel} disabled={!selected} />
      </div>
    </form>
  );
}
