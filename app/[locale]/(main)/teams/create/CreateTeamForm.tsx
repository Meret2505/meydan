"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createTeam } from "@/app/actions/teams";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function CreateTeamForm({
  districts,
  labels,
}: {
  districts: string[];
  labels: { name: string; district: string; submit: string; hint: string };
}) {
  const locale = useLocale();
  return (
    <form action={createTeam} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Field label={labels.name}>
        <input
          name="name"
          required
          minLength={2}
          placeholder="Берзенги Юнайтед"
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[16px] outline-none focus:border-primary"
        />
      </Field>
      <Field label={labels.district}>
        <select
          name="district"
          defaultValue=""
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        >
          <option value="">—</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-text-muted text-[12.5px] leading-relaxed">{labels.hint}</p>
      <Submit label={labels.submit} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-[#8A938E]">{label}</span>
      {children}
    </div>
  );
}
