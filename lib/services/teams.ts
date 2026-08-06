import { prisma } from "@/lib/prisma";

/**
 * Team membership operations, extracted from app/actions/teams.ts so the web
 * actions and the mobile API share one implementation.
 *
 * The invariant worth guarding here is captain vacancy: there is no
 * captain-transfer mechanism anywhere in the product, so a captain must never
 * be able to leave a team that outlives them. `leaveTeam` refuses, and the only
 * way a captain exits is disbanding the team entirely.
 */

export const TEAM_COLORS = ["green", "blue", "amber", "red", "purple"] as const;

export type CreateTeamInput = {
  name: string;
  district?: string | null;
  color?: string | null;
};

export type CreateTeamResult =
  | { ok: true; teamId: string }
  | { ok: false; error: "invalid_input" };

/** Creates a team with its creator installed as captain. */
export async function createTeam(
  userId: string,
  input: CreateTeamInput,
): Promise<CreateTeamResult> {
  const name = input.name.trim();
  // Matches the web form's floor; a one-character team name is a typo, not a name.
  if (name.length < 2) return { ok: false, error: "invalid_input" };

  const district = input.district?.trim() || null;
  const color = (TEAM_COLORS as readonly string[]).includes(input.color ?? "")
    ? (input.color as string)
    : "green";

  const team = await prisma.team.create({
    data: {
      name,
      district,
      color,
      members: { create: { userId, isCaptain: true } },
    },
  });

  return { ok: true, teamId: team.id };
}

export type JoinTeamResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: "not_found" };

/** Adds the user to a team. Idempotent — joining twice reports `alreadyMember`. */
export async function joinTeam(
  teamId: string,
  userId: string,
): Promise<JoinTeamResult> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) return { ok: false, error: "not_found" };

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });

  return { ok: true, alreadyMember: !!existing };
}

export type LeaveTeamError = "not_found" | "not_member" | "captain_cannot_leave";

export type LeaveTeamResult = { ok: true } | { ok: false; error: LeaveTeamError };

/**
 * Removes the user from a team.
 *
 * A captain cannot leave: no hand-off action exists, so the team would be left
 * captain-less and unmanageable. Disbanding is the captain's exit.
 */
export async function leaveTeam(
  teamId: string,
  userId: string,
): Promise<LeaveTeamResult> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) {
    // Distinguish "no such team" from "not on this team" so the API can 404 vs
    // 409 rather than reporting both the same way.
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    return { ok: false, error: team ? "not_member" : "not_found" };
  }
  if (member.isCaptain) return { ok: false, error: "captain_cannot_leave" };

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });
  return { ok: true };
}
