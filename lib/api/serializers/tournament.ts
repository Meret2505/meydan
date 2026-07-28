import { tournamentStatus, type TournamentStatus } from "@/lib/tournament-status";

/**
 * A tournament as the mobile tournaments list renders it. `status` is computed
 * server-side (from dates + cancelled) so the client's tab filtering does not
 * re-derive it and cannot disagree with the web.
 */
export interface TournamentCardDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  teamsCount: number;
  matchesCount: number;
  status: TournamentStatus;
}

type TournamentWithCounts = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  cancelled: boolean;
  _count: { teams: number; matches: number };
};

export function toTournamentCardDto(t: TournamentWithCounts): TournamentCardDto {
  return {
    id: t.id,
    name: t.name,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate ? t.endDate.toISOString() : null,
    teamsCount: t._count.teams,
    matchesCount: t._count.matches,
    status: tournamentStatus(t),
  };
}
