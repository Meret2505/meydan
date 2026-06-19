"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  registerTeamForTournament,
  unregisterTeamFromTournament,
} from "@/app/actions/tournaments";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  district: string | null;
  members: number;
  registered: boolean;
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function RegisterTeamPicker({
  tournamentId,
  locale,
  teams,
}: {
  tournamentId: string;
  locale: string;
  teams: Team[];
}) {
  const _locale = useLocale();
  const [picked, setPicked] = useState<string | null>(
    teams.find((t) => t.registered)?.id ?? teams[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5 text-center">
        <div className="font-display font-extrabold text-[16px]">
          Нет команд, которые вы возглавляете
        </div>
        <p className="text-text-muted text-[13.5px] mt-2 leading-relaxed">
          Чтобы зарегистрировать команду на турнир, нужно быть её капитаном.
        </p>
        <Link
          href={`/${locale}/teams/create`}
          className="mt-3.5 inline-flex h-10 px-4 rounded-lg bg-primary text-primary-text font-display font-extrabold text-[13px] items-center"
        >
          Создать команду
        </Link>
      </div>
    );
  }

  const pickedTeam = teams.find((t) => t.id === picked) ?? null;

  return (
    <>
      <div>
        <div className="text-[13px] font-bold text-text-muted mb-2.5">Команда</div>
        <div className="flex flex-col gap-2">
          {teams.map((t) => {
            const active = picked === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPicked(t.id)}
                className={cn(
                  "flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border-[1.5px] text-left",
                  active ? "border-primary" : "border-border",
                )}
              >
                <div
                  className={cn(
                    "w-[46px] h-[46px] rounded-[13px] flex items-center justify-center font-display font-extrabold text-[15px]",
                    active
                      ? "bg-primary text-primary-text"
                      : "bg-white/5 text-text-soft border border-white/10",
                  )}
                >
                  {monogram(t.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[15px] truncate">
                    {t.name}
                  </div>
                  <div className="text-text-muted text-[12.5px] mt-0.5">
                    Вы — капитан · {t.members}{" "}
                    {t.members === 1 ? "игрок" : t.members < 5 ? "игрока" : "игроков"}
                  </div>
                </div>
                {active && (
                  <span className="text-primary font-display font-extrabold text-[17px]">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 px-6 pb-4 pt-3 bg-gradient-to-t from-bg via-bg/95 to-transparent z-30">
        {pickedTeam?.registered ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                unregisterTeamFromTournament(tournamentId, pickedTeam.id, locale),
              )
            }
            className="w-full h-[58px] rounded-[16px] border-[1.5px] border-danger/40 text-danger font-display font-extrabold text-[16px] disabled:opacity-50"
          >
            Снять заявку
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending || !pickedTeam}
            onClick={() =>
              pickedTeam &&
              startTransition(() =>
                registerTeamForTournament(tournamentId, pickedTeam.id, locale),
              )
            }
            className="w-full h-[58px] rounded-[16px] bg-primary text-primary-text font-display font-extrabold text-[17px] disabled:opacity-50"
          >
            Подать заявку
          </button>
        )}
      </div>
    </>
  );
}
