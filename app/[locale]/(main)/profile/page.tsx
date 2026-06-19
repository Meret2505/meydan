import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats, attendanceTier } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { LogoutButton } from "./LogoutButton";

export default async function ProfilePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return null;
  const stats = await getPlayerStats(user.id);
  const tier = attendanceTier(stats.attendanceRate);

  const initials =
    user.name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const tierStyles: Record<typeof tier, { bg: string; text: string; label: string }> = {
    reliable: { bg: "bg-primary/15", text: "text-primary", label: t("attendance.reliable") },
    ok: { bg: "bg-warning/15", text: "text-warning", label: `${stats.attendanceRate ?? 0}%` },
    poor: { bg: "bg-danger/15", text: "text-danger", label: `${stats.attendanceRate ?? 0}%` },
    new: { bg: "bg-white/8", text: "text-text-muted", label: t("attendance.new_player") },
  };
  const badge = tierStyles[tier];

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[22px]">
          {t("profile.title")}
        </div>
        <LocaleToggle />
      </div>

      <div className="px-7 pt-7 flex flex-col items-center text-center">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center font-display font-extrabold text-[40px] text-[#06210F]"
          style={{ background: "linear-gradient(140deg,#22c55e,#14a955)" }}
        >
          {initials}
        </div>
        <div className="mt-5 font-display font-extrabold text-[24px]">{user.name}</div>
        <div className="mt-1 text-text-muted text-[14px]">
          {user.district ?? "—"} ·{" "}
          {user.position ? t(`positions.${user.position}`) : "—"}
        </div>
        <div className={`mt-3 inline-flex px-3 py-1.5 rounded-full text-[12px] font-display font-bold ${badge.bg} ${badge.text}`}>
          {badge.label}
        </div>
      </div>

      <div className="px-6 pt-8 grid grid-cols-3 gap-3">
        <Stat label={t("profile.stats_played")} value={stats.gamesPlayed.toString()} />
        <Stat
          label={t("profile.stats_attendance")}
          value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
        />
        <Stat label={t("profile.stats_joined")} value={stats.totalJoined.toString()} />
      </div>

      <div className="px-6 pt-8 flex flex-col gap-3">
        <Link
          href={`/${locale}/profile/edit`}
          className="h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-between px-4 text-text font-sans font-semibold text-[15px]"
        >
          <span>{t("profile.edit")}</span>
          <span>›</span>
        </Link>
        <LogoutButton locale={locale} logoutLabel={t("auth.logout")} />
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
