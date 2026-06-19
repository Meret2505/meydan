"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { createTeam } from "@/app/actions/teams";
import { TEAM_COLORS, DEFAULT_TEAM_COLOR, getTeamColor } from "@/lib/team-color";
import { cn } from "@/lib/utils";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

function monogram(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CreateTeamForm({
  districts,
  labels,
}: {
  districts: string[];
  labels: { name: string; district: string; submit: string; hint: string };
}) {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState(DEFAULT_TEAM_COLOR.key);
  const color = getTeamColor(colorKey);

  return (
    <form action={createTeam} className="px-7 pt-6 pb-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="color" value={colorKey} />

      <div className="flex flex-col items-center gap-3.5">
        <div
          className="w-[84px] h-[84px] rounded-[24px] flex items-center justify-center font-display font-extrabold text-[26px] text-[#06210F]"
          style={{ background: `linear-gradient(140deg, ${color.base}, ${color.edge})` }}
        >
          {monogram(name)}
        </div>
        <div className="flex gap-2.5">
          {TEAM_COLORS.map((c) => {
            const active = c.key === colorKey;
            return (
              <button
                key={c.key}
                type="button"
                aria-label={c.key}
                onClick={() => setColorKey(c.key)}
                className={cn(
                  "w-[30px] h-[30px] rounded-full transition",
                  active ? "ring-[3px] ring-[#F2F5F3] ring-offset-0" : "",
                )}
                style={{ background: c.base }}
              />
            );
          })}
        </div>
      </div>

      <Field label={labels.name}>
        <input
          name="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Berzeňňi United"
          className="w-full h-14 rounded-[15px] bg-[#13181A] border-[1.5px] border-white/10 px-4 text-text font-sans font-bold text-[16px] outline-none focus:border-primary"
        />
      </Field>

      <Field label={labels.district}>
        <select
          name="district"
          defaultValue=""
          className="w-full h-14 rounded-[15px] bg-[#13181A] border-[1.5px] border-white/10 px-4 text-text font-sans font-semibold text-[15px] outline-none focus:border-primary"
        >
          <option value="">—</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>

      <div
        className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
        style={{
          background: "rgba(31,209,107,.08)",
          border: "1px solid rgba(31,209,107,.22)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5BE39A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />
        </svg>
        <span className="text-[13px] leading-snug" style={{ color: "#A9E2C2" }}>
          {labels.hint}
        </span>
      </div>

      <Submit label={labels.submit} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-bold text-text-muted">{label}</span>
      {children}
    </div>
  );
}
