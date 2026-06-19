"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/app/actions/profile";
import type { Position, SkillLevel } from "@prisma/client";

interface User {
  name: string;
  district: string | null;
  position: Position | null;
  skillLevel: SkillLevel;
  age: number | null;
  isOpenToInvite: boolean;
}

const SKILL_LEVELS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function ProfileEditForm({
  user,
  positions,
  districts,
  saveLabel,
}: {
  user: User;
  positions: { value: Position; label: string }[];
  districts: string[];
  saveLabel: string;
}) {
  const locale = useLocale();
  return (
    <form action={updateProfile} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Field label="Имя">
        <input
          name="name"
          defaultValue={user.name}
          required
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Район">
        <select
          name="district"
          defaultValue={user.district ?? ""}
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
      <Field label="Позиция">
        <select
          name="position"
          defaultValue={user.position ?? ""}
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        >
          <option value="">—</option>
          {positions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Уровень">
        <select
          name="skillLevel"
          defaultValue={user.skillLevel}
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        >
          {SKILL_LEVELS.map((s) => (
            <option key={s} value={s}>
              {s === "BEGINNER" ? "Начинающий" : s === "INTERMEDIATE" ? "Средний" : "Опытный"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Возраст">
        <input
          name="age"
          type="number"
          min={10}
          max={80}
          defaultValue={user.age ?? ""}
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>
      <label className="flex items-center justify-between rounded-xl bg-surface border border-border px-4 h-14">
        <span className="font-sans font-semibold text-[15px]">
          Открыт для приглашений в игры
        </span>
        <input
          type="checkbox"
          name="isOpenToInvite"
          defaultChecked={user.isOpenToInvite}
          className="w-5 h-5 accent-primary"
        />
      </label>
      <Submit label={saveLabel} />
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
