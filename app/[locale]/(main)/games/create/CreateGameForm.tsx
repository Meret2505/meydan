"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createGame } from "@/app/actions/games";
import { toDatetimeLocalValue } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Position } from "@prisma/client";

interface Field {
  id: string;
  name: string;
  district: string;
}

interface Labels {
  when: string;
  field: string;
  fieldFree: string;
  totalSpots: string;
  needed: string;
  notes: string;
  submit: string;
  choose: string;
}

function defaultScheduled() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toDatetimeLocalValue(d);
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function CreateGameForm({
  fields,
  positions,
  labels,
}: {
  fields: Field[];
  positions: { value: Position; label: string }[];
  labels: Labels;
}) {
  const locale = useLocale();
  const [useCustom, setUseCustom] = useState(fields.length === 0);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedPositions, setSelectedPositions] = useState<Position[]>([]);

  function toggle(p: Position) {
    setSelectedPositions((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    );
  }

  return (
    <form action={createGame} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {selectedPositions.map((p) => (
        <input key={p} type="hidden" name="neededPositions" value={p} />
      ))}

      <Field label={labels.when}>
        <input
          type="datetime-local"
          name="scheduledAt"
          defaultValue={defaultScheduled()}
          required
          className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        />
      </Field>

      <Field label={labels.field}>
        {fields.length > 0 && !useCustom ? (
          <>
            <select
              name="fieldId"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
            >
              <option value="">—</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.district}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setUseCustom(true);
                setSelectedFieldId("");
              }}
              className="self-start text-primary text-[13px] font-semibold mt-1"
            >
              {labels.fieldFree}
            </button>
          </>
        ) : (
          <>
            <input
              name="fieldName"
              placeholder="Поле «Олимп», корт 2"
              required={useCustom}
              className="w-full h-12 rounded-xl bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
            />
            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => setUseCustom(false)}
                className="self-start text-primary text-[13px] font-semibold mt-1"
              >
                {labels.choose}
              </button>
            )}
          </>
        )}
      </Field>

      <Field label={labels.totalSpots}>
        <div className="flex gap-2">
          {[6, 8, 10, 12, 14].map((n) => (
            <label
              key={n}
              className="flex-1 h-12 rounded-xl bg-[#13181A] border border-white/10 flex items-center justify-center font-display font-extrabold text-[15px] cursor-pointer has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary has-[input:checked]:text-primary"
            >
              <input
                type="radio"
                name="totalSpots"
                value={n}
                defaultChecked={n === 10}
                className="sr-only"
                required
              />
              {n}
            </label>
          ))}
        </div>
      </Field>

      <Field label={labels.needed}>
        <div className="grid grid-cols-2 gap-2.5">
          {positions.map((p) => {
            const active = selectedPositions.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => toggle(p.value)}
                className={cn(
                  "h-12 rounded-xl border flex items-center justify-center font-display font-bold text-[14px]",
                  active
                    ? "bg-warning/12 border-warning/40 text-warning"
                    : "bg-surface border-white/10 text-text-muted",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={labels.notes}>
        <textarea
          name="notes"
          rows={3}
          placeholder="Например: вода с собой, мяч обеспечен"
          className="w-full rounded-xl bg-[#13181A] border border-white/10 px-4 py-3 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary resize-none"
        />
      </Field>

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
