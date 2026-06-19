"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { savePhone } from "@/app/actions/onboarding";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function PhoneForm({
  initial,
  privateHint,
  nextLabel,
}: {
  initial: string;
  privateHint: string;
  nextLabel: string;
}) {
  const locale = useLocale();
  return (
    <form action={savePhone} className="flex flex-col flex-1 px-7 pt-8">
      <input type="hidden" name="locale" value={locale} />
      <Input
        name="phone"
        defaultValue={initial}
        prefix="+993"
        placeholder="65 12 34 56"
        inputMode="tel"
        required
      />
      <div className="flex items-center gap-2 mt-3.5 text-text-muted text-[12.5px]">
        <span className="w-4.5 h-4.5 rounded bg-primary/15 inline-flex items-center justify-center text-primary">
          🔒
        </span>
        {privateHint}
      </div>
      <div className="flex-1" />
      <div className="pb-12">
        <Submit label={nextLabel} />
      </div>
    </form>
  );
}
