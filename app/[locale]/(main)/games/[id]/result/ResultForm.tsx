"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFormStatus } from "react-dom";
import { saveResult } from "@/app/actions/games";

interface Participant {
  userId: string;
  name: string;
  position: string | null;
  attended: boolean | null;
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

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-[58px] rounded-2xl bg-primary text-primary-text font-display font-extrabold text-[17px] disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ScoreStepper({
  label,
  value,
  onChange,
  primary,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="text-[12px] font-bold text-text-muted">{label}</div>
      <div
        className={`font-display font-black text-[46px] leading-none ${
          primary ? "text-primary" : "text-text"
        }`}
      >
        {value}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center font-bold text-[18px]"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(99, value + 1))}
          className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center font-bold text-[18px]"
        >
          +
        </button>
      </div>
    </div>
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
  const [scoreA, setScoreA] = useState(defaultScoreHome);
  const [scoreB, setScoreB] = useState(defaultScoreAway);
  const [attended, setAttended] = useState<Record<string, boolean>>(
    Object.fromEntries(participants.map((p) => [p.userId, p.attended ?? true])),
  );

  const presentCount = Object.values(attended).filter(Boolean).length;

  return (
    <form action={saveResult} className="px-6 pt-5 pb-32 flex flex-col">
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="scoreHome" value={scoreA} />
      <input type="hidden" name="scoreAway" value={scoreB} />

      <div className="text-[13px] font-bold text-text-muted mb-3">Счёт</div>
      <div className="flex items-center justify-center gap-[18px] bg-surface border border-border rounded-[18px] py-[18px]">
        <ScoreStepper label="Команда А" value={scoreA} onChange={setScoreA} primary />
        <span className="font-display font-extrabold text-[28px] text-[#6e756f]">
          :
        </span>
        <ScoreStepper label="Команда Б" value={scoreB} onChange={setScoreB} />
      </div>

      <div className="flex justify-between items-center mt-[22px] mb-3">
        <span className="text-[13px] font-bold text-text-muted">Кто пришёл</span>
        <span className="font-display font-extrabold text-[13px] text-primary-soft">
          {presentCount} из {participants.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {participants.map((p) => {
          const came = attended[p.userId] ?? true;
          return (
            <label
              key={p.userId}
              className="flex items-center gap-3 bg-surface border border-border rounded-[14px] px-3.5 py-3 cursor-pointer"
            >
              <input
                type="checkbox"
                name={`attended_${p.userId}`}
                checked={came}
                onChange={(e) =>
                  setAttended((cur) => ({ ...cur, [p.userId]: e.target.checked }))
                }
                className="sr-only"
              />
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-[13px] text-[#06210F]"
                style={{
                  background: `linear-gradient(140deg, hsl(${hue(p.userId)} 70% 55%), hsl(${
                    (hue(p.userId) + 30) % 360
                  } 70% 40%))`,
                }}
              >
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-bold text-[14.5px] ${
                    came ? "text-text" : "text-text-muted"
                  }`}
                >
                  {p.name}
                </div>
                <div
                  className={`text-[12px] font-bold mt-0.5 ${
                    came ? "text-primary-soft" : "text-danger/80"
                  }`}
                >
                  {came ? labels.came : "не был"}
                </div>
              </div>
              <div
                className={`w-[26px] h-[26px] rounded-lg flex items-center justify-center font-black text-[14px] transition-colors ${
                  came
                    ? "bg-primary text-primary-text border-[1.5px] border-primary"
                    : "bg-transparent text-transparent border-[1.5px] border-white/15"
                }`}
              >
                ✓
              </div>
            </label>
          );
        })}
      </div>

      <div
        className="fixed bottom-20 inset-x-0 px-6 pt-4 pb-4 z-30"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,14,13,0), #0B0E0D 28%)",
        }}
      >
        <Submit label="Сохранить результат" />
      </div>
    </form>
  );
}
