"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createTournament } from "@/app/actions/tournaments";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      Создать
    </Button>
  );
}

export function CreateTournamentForm() {
  const locale = useLocale();
  return (
    <form action={createTournament} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Field label="Название">
        <input
          name="name"
          required
          minLength={2}
          placeholder="Кубок весны 2026"
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[16px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Начало">
        <input
          type="date"
          name="startDate"
          required
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Конец (опционально)">
        <input
          type="date"
          name="endDate"
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Описание">
        <textarea
          name="description"
          rows={3}
          placeholder="Формат, призы, контакты организаторов"
          className="w-full rounded-xl bg-[#13181A] border border-white/10 px-4 py-3 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary resize-none"
        />
      </Field>
      <Submit />
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
