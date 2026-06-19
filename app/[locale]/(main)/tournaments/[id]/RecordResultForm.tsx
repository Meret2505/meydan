"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { recordMatchResult } from "@/app/actions/tournaments";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-10 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] disabled:opacity-50"
    >
      Добавить
    </button>
  );
}

export function RecordResultForm({
  tournamentId,
  locale,
  teams,
}: {
  tournamentId: string;
  locale: string;
  teams: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-lg border border-white/15 text-text font-display font-bold text-[13px]"
      >
        + Добавить результат
      </button>
    );
  }

  return (
    <form
      action={recordMatchResult}
      className="flex flex-col gap-2.5 pt-2 border-t border-border"
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="flex items-center gap-2">
        <select
          name="homeTeamId"
          required
          className="flex-1 h-10 rounded-lg bg-bg border border-border px-2 text-[13px] font-sans font-semibold outline-none focus:border-primary"
        >
          <option value="">Хозяева —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="scoreHome"
          min={0}
          max={99}
          required
          className="w-12 h-10 rounded-lg bg-bg border border-border text-center font-display font-extrabold text-[16px] outline-none focus:border-primary"
        />
        <span className="text-text-muted">:</span>
        <input
          type="number"
          name="scoreAway"
          min={0}
          max={99}
          required
          className="w-12 h-10 rounded-lg bg-bg border border-border text-center font-display font-extrabold text-[16px] outline-none focus:border-primary"
        />
        <select
          name="awayTeamId"
          required
          className="flex-1 h-10 rounded-lg bg-bg border border-border px-2 text-[13px] font-sans font-semibold outline-none focus:border-primary"
        >
          <option value="">Гости —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <input
        name="round"
        placeholder="Группа A / 1/4 / Финал (опц.)"
        className="h-10 rounded-lg bg-bg border border-border px-3 text-[13px] font-sans font-semibold outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 h-10 rounded-lg border border-white/10 text-text-muted font-display font-bold text-[13px]"
        >
          Отмена
        </button>
        <div className="flex-1">
          <Submit />
        </div>
      </div>
    </form>
  );
}
