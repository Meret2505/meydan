import { notFound, redirect } from "next/navigation";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { RegisterTeamPicker } from "./RegisterTeamPicker";

export default async function TournamentRegisterPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const userId = session!.user.id;

  const tr = await prisma.tournament.findUnique({
    where: { id },
    include: {
      _count: { select: { teams: true } },
      teams: { where: { team: { members: { some: { userId, isCaptain: true } } } } },
    },
  });
  if (!tr) notFound();
  if (tr.cancelled) redirect(`/${locale}/tournaments/${id}`);

  const captainTeams = await prisma.team.findMany({
    where: { members: { some: { userId, isCaptain: true } } },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
    // include `color` since RegisterTeamPicker tiles use it
  });

  const registeredTeamIds = new Set(tr.teams.map((t) => t.teamId));

  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const dates =
    tr.endDate
      ? `${dateFmt.format(tr.startDate)} — ${dateFmt.format(tr.endDate)}`
      : dateFmt.format(tr.startDate);

  return (
    <>
      <StatusBar />
      <div className="flex items-center gap-3.5 px-6 pt-4">
        <BackButton href={`/${locale}/tournaments/${id}`} />
        <div>
          <div className="font-display font-extrabold text-[20px]">{t("tournaments.registration_title")}</div>
          <div className="text-text-muted text-[12.5px] font-semibold mt-0.5 truncate max-w-[260px]">
            {tr.name}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-32 flex flex-col gap-4.5">
        <RegisterTeamPicker
          tournamentId={tr.id}
          locale={locale}
          teams={captainTeams.map((t) => ({
            id: t.id,
            name: t.name,
            district: t.district,
            color: t.color,
            members: t._count.members,
            registered: registeredTeamIds.has(t.id),
          }))}
        />

        <div className="rounded-2xl bg-surface border border-border p-4">
          <Row label={t("tournaments.dates")} value={dates} />
          <Row label={t("tournaments.teams_label")} value={tr._count.teams.toString()} />
          {tr.description && (
            <div className="pt-2.5 mt-1 border-t border-border">
              <div className="text-[13px] text-text/85 leading-relaxed whitespace-pre-line">
                {tr.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-warning/10 border border-warning/25">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warning shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <span className="text-[13px] leading-snug text-warning/85">
            {t("tournaments.fee_note_before")}
            <b className="text-warning">{t("tournaments.fee_offline_word")}</b>
            {t("tournaments.fee_note_after")}
          </span>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-text-muted text-[13.5px] font-semibold">{label}</span>
      <span className="font-display font-bold text-[14px]">{value}</span>
    </div>
  );
}
