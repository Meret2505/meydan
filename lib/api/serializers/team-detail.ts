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
}
