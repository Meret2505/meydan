import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats, attendanceTier } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";

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

export default async function PlayerPublicProfile({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const viewerId = session!.user.id;

  const player = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      position: true,
      district: true,
      skillLevel: true,
      isOpenToInvite: true,
      createdAt: true,
    },
  });
  if (!player) notFound();
  if (player.id === viewerId) {
    return (
      <>
        <StatusBar />
        <div className="px-6 pt-4 flex items-center gap-4">
          <BackButton href={`/${locale}/players`} />
        </div>
        <div className="px-7 pt-10 text-center text-text-muted">
          Это вы.{" "}
          <Link href={`/${locale}/profile`} className="text-primary font-bold">
            Открыть мой профиль
          </Link>
        </div>
      </>
    );
  }

  const stats = await getPlayerStats(player.id);
  const tier = attendanceTier(stats.attendanceRate);

  const tierStyles: Record<typeof tier, { bg: string; text: string; label: string }> = {
    reliable: { bg: "bg-primary/15", text: "text-primary", label: t("attendance.reliable") },
    ok: { bg: "bg-warning/15", text: "text-warning", label: `${stats.attendanceRate}%` },
    poor: { bg: "bg-danger/15", text: "text-danger", label: `${stats.attendanceRate}%` },
    new: { bg: "bg-white/8", text: "text-text-muted", label: t("attendance.new_player") },
  };
  const badge = tierStyles[tier];

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/players`} />
      </div>
      <div className="px-7 pt-6 flex flex-col items-center text-center">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center font-display font-extrabold text-[40px] text-[#06210F]"
          style={{
            background: `linear-gradient(140deg, hsl(${hue(player.id)} 70% 55%), hsl(${
              (hue(player.id) + 30) % 360
            } 70% 40%))`,
          }}
        >
          {initials(player.name)}
        </div>
        <div className="mt-5 font-display font-extrabold text-[24px]">{player.name}</div>
        <div className="mt-1 text-text-muted text-[14px]">
          {player.district ?? "—"} ·{" "}
          {player.position ? t(`positions.${player.position}`) : "—"} ·{" "}
          {player.skillLevel === "BEGINNER"
            ? "Начинающий"
            : player.skillLevel === "INTERMEDIATE"
            ? "Средний"
            : "Опытный"}
        </div>
        <div
          className={`mt-3 inline-flex px-3 py-1.5 rounded-full text-[12px] font-display font-bold ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </div>
      </div>

      <div className="px-6 pt-7 grid grid-cols-3 gap-3">
        <Stat label="Игр" value={stats.gamesPlayed.toString()} />
        <Stat
          label="Посещение"
          value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
        />
        <Stat label="Записан" value={stats.totalJoined.toString()} />
      </div>

      <div className="px-6 pt-8 pb-12">
        {player.isOpenToInvite ? (
          <Link
            href={`/${locale}/players/${player.id}/invite`}
            className="w-full h-[58px] rounded-lg bg-primary text-primary-text font-display font-extrabold text-[17px] flex items-center justify-center"
          >
            Пригласить в игру
          </Link>
        ) : (
          <div className="h-[58px] rounded-lg border border-white/10 text-text-muted font-display font-bold text-[14px] flex items-center justify-center">
            Игрок закрыл приглашения
          </div>
        )}
        <p className="text-text-muted text-[12px] text-center mt-3">
          Телефон откроется после того, как игрок присоединится к вашей игре.
        </p>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 text-center">
      <div className="font-display font-extrabold text-[22px]">{value}</div>
      <div className="text-text-muted text-[12px] mt-1">{label}</div>
    </div>
  );
}
