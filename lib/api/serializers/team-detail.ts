/**
 * Full team detail for the mobile team page: identity, aggregate record, and
 * the roster with per-member attendance. Built in the service (it needs async
 * stats per member); this file only types the shape.
 */
export interface TeamMemberDto {
  id: string;
  name: string;
  position: string | null;
  isCaptain: boolean;
  attendanceRate: number | null;
}

export interface TeamDetailDto {
  id: string;
  name: string;
  color: string | null;
  district: string | null;
  memberCount: number;
  wins: number;
  losses: number;
  points: number;
  members: TeamMemberDto[];
  /** Viewer context — drives the join/leave action. */
  isMember: boolean;
  /** Captains cannot leave; their exit is disbanding the team. */
  isCaptain: boolean;
  /**
   * Teams the *viewer* captains that could challenge this one — big enough
   * to play, and not this team.
   *
   * Sent rather than derived on the client: `isCaptain` above is about the
   * team being looked at, and a client concluding it may act because it
   * captains some other team is the shape of bug this avoids. Empty means
   * the challenge action does not belong to this viewer.
   */
  challengeableBy: { id: string; name: string }[];
}
