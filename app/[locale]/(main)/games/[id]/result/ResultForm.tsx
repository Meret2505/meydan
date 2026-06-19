"use client";

import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { saveResult } from "@/app/actions/games";

interface Participant {
  userId: string;
  name: string;
  position: string | null;
  attended: boolean | null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function ResultForm({
  gameId,
  defaultScoreHome,
  defaultScoreAway,
  participants,
  labels,
}: {
  gameId: string;
  defaultScoreHome: number;
  defaultScoreAway: number;
  participants: Participant[];
  labels: { save: string; came: string };
}) {
  const locale = useLocale();
  return (
    <form action={saveResult} className="px-6 pt-6 pb-8 flex flex-col gap-6">
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="flex items-center justify-center gap-4">
        <ScoreInput name="scoreHome" defaultValue={defaultScoreHome} />
        <div className="font-display font-extrabold text-text-muted text-[28px]">:</div>
        <ScoreInput name="scoreAway" defaultValue={defaultScoreAway} />
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <label
            key={p.userId}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-surface border border-border cursor-pointer has-[input:checked]:bg-primary/8 has-[input:checked]:border-primary/40"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold text-[12px] text-[#06210F]"
              style={{
                background: `linear-gradient(140deg, hsl(${hue(p.userId)} 70% 55%), hsl(${
                  (hue(p.userId) + 30) % 360
                } 70% 40%))`,
              }}
            >
              {initials(p.name)}
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-[14.5px]">{p.name}</div>
              {p.position && (
                <div className="text-text-muted text-[12px]">{p.position}</div>
              )}
            </div>
            <span className="text-text-muted text-[12px] font-bold mr-2">{labels.came}</span>
            <input
              type="checkbox"
              name={`attended_${p.userId}`}
              defaultChecked={p.attended ?? true}
              className="w-6 h-6 accent-primary"
            />
          </label>
        ))}
      </div>

      <Submit label={labels.save} />
    </form>
  );
}

function ScoreInput({ name, defaultValue }: { name: string; defaultValue: number }) {
  return (
    <input
      type="number"
      name={name}
      defaultValue={defaultValue}
      min={0}
      max={99}
      className="w-24 h-20 rounded-2xl bg-surface border border-border text-center font-display font-extrabold text-[44px] text-text outline-none focus:border-primary"
    />
  );
}
