import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { computeStandings, tournamentStatus } from "@/lib/tournament-status";
import { RegisterTeamControls } from "./RegisterTeamControls";
import { RecordResultForm } from "./RecordResultForm";
import { CancelTournamentButton } from "./CancelTournamentButton";

export default async function TournamentDetail({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await auth();
  const userId = session!.user.id;

  const tr = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          team: {
            include: { _count: { select: { members: true } } },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      matches: {
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!tr) notFound();

  const status = tournamentStatus(tr);
  const isCreator = tr.creatorId === userId;

  // teams where viewer is captain (to register/unregister)
  const myCaptainTeams = await prisma.teamMember.findMany({
    where: { userId, isCaptain: true },
    include: { team: { select: { id: true, name: true } } },
  });

  const registeredTeamIds = tr.teams.map((t) => t.teamId);
  const standings = computeStandings(
    registeredTeamIds,
    tr.matches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
    })),
  );
  const teamName = new Map(tr.teams.map((t) => [t.teamId, t.team.name]));

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/tournaments`} />
      </div>

      <div className="px-6 pt-5 pb-32 flex flex-col gap-4">
        <div className="rounded-2xl bg-surface border border-border p-5">
          <div className="font-display font-extrabold text-[22px] tracking-tight">
            {tr.name}
          </div>
          <div className="text-text-muted text-[13px] mt-1">
            {dateFmt.format(tr.startDate)}
            {tr.endDate ? ` — ${dateFmt.format(tr.endDate)}` : ""} ·{" "}
            <span
              className={
                status === "ongoing"
                  ? "text-primary font-bold"
                  : status === "cancelled"
                  ? "text-danger font-bold"
                  : ""
              }
            >
              {status === "upcoming"
                ? "скоро"
                : status === "ongoing"
                ? "идёт"
                : status === "cancelled"
                ? "отменён"
                : "завершён"}
            </span>
          </div>
          {tr.description && (
            <p className="mt-3 text-[14px] text-text/85 leading-relaxed whitespace-pre-line">
              {tr.description}
            </p>
          )}
        </div>

        <Section title={`Команды (${tr.teams.length})`}>
          {tr.teams.length === 0 ? (
            <div className="text-text-muted text-[13px]">Пока никто не зарегистрировался.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tr.teams.map((tt) => (
                <Link
                  key={tt.id}
                  href={`/${locale}/teams/${tt.team.id}`}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12.5px] font-display font-bold"
                >
                  {tt.team.name}{" "}
                  <span className="text-text-muted font-sans font-semibold">
                    · {tt.team._count.members}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {status !== "cancelled" && status !== "ended" && myCaptainTeams.length > 0 && (
            <RegisterTeamControls
              tournamentId={tr.id}
              locale={locale}
              myTeams={myCaptainTeams.map((m) => ({
                id: m.team.id,
                name: m.team.name,
                registered: registeredTeamIds.includes(m.team.id),
              }))}
            />
          )}
        </Section>

        {standings.length > 0 && tr.matches.length > 0 && (
          <Section title="Таблица">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] font-sans">
                <thead>
                  <tr className="text-text-muted text-[11.5px] uppercase font-display font-bold">
                    <th className="text-left py-2 pr-2">Команда</th>
                    <th className="px-1">И</th>
                    <th className="px-1">В</th>
                    <th className="px-1">Н</th>
                    <th className="px-1">П</th>
                    <th className="px-1">±</th>
                    <th className="pl-2 text-right text-primary">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r, i) => (
                    <tr key={r.teamId} className="border-t border-border">
                      <td className="py-2 pr-2 truncate">
                        <span className="text-text-muted mr-2">{i + 1}.</span>
                        {teamName.get(r.teamId)}
                      </td>
                      <td className="px-1 text-center">{r.played}</td>
                      <td className="px-1 text-center">{r.won}</td>
                      <td className="px-1 text-center">{r.drawn}</td>
                      <td className="px-1 text-center">{r.lost}</td>
                      <td className="px-1 text-center">
                        {r.goalsFor}:{r.goalsAgainst}
                      </td>
                      <td className="pl-2 text-right font-display font-extrabold text-primary">
                        {r.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <Section title={`Матчи (${tr.matches.length})`}>
          {tr.matches.length === 0 ? (
            <div className="text-text-muted text-[13px]">
              Матчи появятся после первого результата.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tr.matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border"
                >
                  <div className="flex-1 truncate text-right pr-3 font-display font-bold text-[14px]">
                    {m.homeTeam.name}
                  </div>
                  <div className="font-display font-extrabold text-[18px] text-primary">
                    {m.scoreHome} : {m.scoreAway}
                  </div>
                  <div className="flex-1 truncate text-left pl-3 font-display font-bold text-[14px]">
                    {m.awayTeam.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {status !== "cancelled" && status !== "ended" && tr.teams.length >= 2 && (
            <RecordResultForm
              tournamentId={tr.id}
              locale={locale}
              teams={tr.teams.map((tt) => ({
                id: tt.team.id,
                name: tt.team.name,
              }))}
            />
          )}
        </Section>

        {isCreator && status !== "cancelled" && status !== "ended" && (
          <CancelTournamentButton tournamentId={tr.id} locale={locale} />
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
      <div className="text-text-muted text-[11.5px] font-display font-bold uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}
