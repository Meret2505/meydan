"use client";

import { useLocale, useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createTournament } from "@/app/actions/tournaments";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function CreateTournamentForm() {
  const locale = useLocale();
  const t = useTranslations();
  return (
    <form action={createTournament} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("tournaments.name_label")}>
        <input
          name="name"
          required
          minLength={2}
          placeholder={t("tournaments.name_placeholder")}
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[16px] outline-none focus:border-primary"
        />
      </Field>
      <Field label={t("tournaments.start_label")}>
        <input
          type="date"
          name="startDate"
          required
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <Field label={t("tournaments.end_label")}>
        <input
          type="date"
          name="endDate"
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <Field label={t("tournaments.description_label")}>
        <textarea
          name="description"
          rows={3}
          placeholder={t("tournaments.description_placeholder")}
          className="w-full rounded-xl bg-[#13181A] border border-white/10 px-4 py-3 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary resize-none"
        />
      </Field>
      <Submit label={t("tournaments.create")} />
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
