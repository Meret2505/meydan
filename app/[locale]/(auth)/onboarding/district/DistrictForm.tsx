"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { saveDistrict } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {label}
    </Button>
  );
}

export function DistrictForm({
  districts,
  initial,
  nextLabel,
}: {
  districts: string[];
  initial: string | null;
  nextLabel: string;
}) {
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(initial);

  return (
    <form action={saveDistrict} className="flex flex-col flex-1 min-h-0 pt-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="district" value={selected ?? ""} />
      <div className="flex-1 overflow-auto scrollbar-none px-7 flex flex-col gap-2.5">
        {districts.map((d) => {
          const active = selected === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                "flex items-center gap-3 h-[58px] rounded-[15px] px-4 border text-left",
                active
                  ? "bg-primary/8 border-primary"
                  : "bg-surface border-white/10",
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", active ? "bg-primary" : "bg-white/15")} />
              <span className="flex-1 font-sans font-semibold text-[16px]">{d}</span>
              {active && <span className="text-primary font-extrabold text-[17px]">✓</span>}
            </button>
          );
        })}
      </div>
      <div className="px-7 pt-4 pb-12">
        <Submit label={nextLabel} disabled={!selected} />
      </div>
    </form>
  );
}
