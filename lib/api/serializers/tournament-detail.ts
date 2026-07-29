import { computeStandings, tournamentStatus, type TournamentStatus } from "@/lib/tournament-status";

/**
 * Full tournament detail for the mobile page: header, registered teams, the
 * computed standings table, and the match list. Standings are computed
 * server-side with the same computeStandings the web uses, so the two never
 * disagree.
 */
export interface TournamentTeamDto {
  id: string;
  name: string;
  memberCount: number;
}

export interface StandingsRowDto {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface TournamentMatchDto {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface TournamentDetailDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  status: TournamentStatus;
  teams: TournamentTeamDto[];
  standings: StandingsRowDto[];
  matches: TournamentMatchDto[];
}

type TournamentWithRelations = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  cancelled: boolean;
  description: string | null;
  teams: { id: string; teamId: string; team: { id: string; name: string; _count: { members: number } } }[];
  matches: {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    scoreHome: number | null;
    scoreAway: number | null;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
  }[];
};

export function toTournamentDetailDto(tr: TournamentWithRelations): TournamentDetailDto {
  const teamName = new Map(tr.teams.map((t) => [t.teamId, t.team.name]));
  const standings = computeStandings(
    tr.teams.map((t) => t.teamId),
    tr.matches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
    })),
  );

  return {
    id: tr.id,
    name: tr.name,
    startDate: tr.startDate.toISOString(),
    endDate: tr.endDate ? tr.endDate.toISOString() : null,
    description: tr.description,
    status: tournamentStatus(tr),
    teams: tr.teams.map((t) => ({
      id: t.team.id,
      name: t.team.name,
      memberCount: t.team._count.members,
    })),
    standings: standings.map((r) => ({
      teamId: r.teamId,
      teamName: teamName.get(r.teamId) ?? "—",
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      points: r.points,
    })),
    matches: tr.matches.map((m) => ({
      id: m.id,
      homeTeamName: m.homeTeam.name,
      awayTeamName: m.awayTeam.name,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
    })),
  };
}
