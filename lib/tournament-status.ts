export type TournamentStatus = "upcoming" | "ongoing" | "ended" | "cancelled";

export function tournamentStatus(t: {
  startDate: Date;
  endDate: Date | null;
  cancelled: boolean;
}): TournamentStatus {
  if (t.cancelled) return "cancelled";
  const now = Date.now();
  if (now < t.startDate.getTime()) return "upcoming";
  if (t.endDate && now > t.endDate.getTime()) return "ended";
  return "ongoing";
}

export interface MatchLite {
  homeTeamId: string;
  awayTeamId: string;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface StandingsRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
}

export function computeStandings(
  registeredTeamIds: string[],
  matches: MatchLite[],
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  for (const id of registeredTeamIds) {
    rows.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      diff: 0,
      points: 0,
    });
  }
  for (const m of matches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.scoreHome;
    home.goalsAgainst += m.scoreAway;
    away.goalsFor += m.scoreAway;
    away.goalsAgainst += m.scoreHome;
    if (m.scoreHome > m.scoreAway) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.scoreHome < m.scoreAway) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
    home.diff = home.goalsFor - home.goalsAgainst;
    away.diff = away.goalsFor - away.goalsAgainst;
  }
  return Array.from(rows.values()).sort(
    (a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor,
  );
}
