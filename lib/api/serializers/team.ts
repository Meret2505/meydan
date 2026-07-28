/**
 * A team as the mobile teams list renders it. `mine` distinguishes the user's
 * teams (shown as cards) from the city ranking (shown as a compact list),
 * matching the web teams page's two sections.
 */
export interface TeamCardDto {
  id: string;
  name: string;
  color: string | null;
  district: string | null;
  memberCount: number;
  gamesCount: number;
  captainName: string | null;
  mine: boolean;
}

type TeamWithCounts = {
  id: string;
  name: string;
  color: string | null;
  district: string | null;
  _count: { members: number; games: number };
  members?: { user: { name: string } }[];
};

export function toTeamCardDto(team: TeamWithCounts, mine: boolean): TeamCardDto {
  return {
    id: team.id,
    name: team.name,
    color: team.color,
    district: team.district,
    memberCount: team._count.members,
    gamesCount: team._count.games,
    // The captain include is only present for the user's own teams.
    captainName: team.members?.[0]?.user.name ?? null,
    mine,
  };
}
