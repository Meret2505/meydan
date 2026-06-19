"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { saveName } from "@/app/actions/onboarding";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function NameForm({ initial, nextLabel }: { initial: string; nextLabel: string }) {
  const locale = useLocale();
  return (
    <form
      action={saveName}
      className="flex flex-col flex-1 px-7 pt-7"
    >
      <input type="hidden" name="locale" value={locale} />
      <input
        name="name"
        defaultValue={initial}
        required
        autoFocus
        className="w-full h-14 rounded-[15px] bg-[#13181A] border border-white/10 px-4 text-text font-sans font-bold text-[17px] text-center outline-none focus:border-primary"
      />
      <div className="flex-1" />
      <div className="pb-12">
        <Submit label={nextLabel} />
      </div>
    </form>
  );
}
