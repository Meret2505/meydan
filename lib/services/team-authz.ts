import { prisma } from "@/lib/prisma";

/**
 * Who may act for a team, and whether a team is a team yet.
 *
 * Captain-ness was open-coded in four places — `removeMember` and
 * `disbandTeam` in teams.ts, a private `assertCaptain` in tournaments.ts, and
 * a `members: { some: { isCaptain: true } }` filter in the query layer. Team
 * matches add several more callers, so the check gets one home before it gets
 * a fifth spelling.
 */

/**
 * The client or a transaction handle. Captain checks happen inside
 * transactions (accepting a challenge locks the row first), so the helpers
 * must take whichever is at hand rather than reaching for the global client.
 */
type Db = Pick<typeof prisma, "teamMember">;

/**
 * How many members a team needs before it can arrange a match.
 *
 * Five, because the app's default game is 5×5 and a "team" that is one person
 * — which is every team the moment it is created — is not one. The number is
 * a floor on arranging, not on playing: who actually turns up is the
 * captain's problem, and they tick attendance afterwards.
 */
export const MIN_ROSTER_TO_ARRANGE_MATCH = 5;

export async function isCaptainOf(
  teamId: string,
  userId: string,
  db: Db = prisma,
): Promise<boolean> {
  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { isCaptain: true },
  });
  return member?.isCaptain === true;
}

export async function rosterSize(teamId: string, db: Db = prisma): Promise<number> {
  return db.teamMember.count({ where: { teamId } });
}

/**
 * Whether the team has enough people to challenge or accept.
 *
 * Counted rather than read from a cached column because nothing maintains one
 * — and a roster that shrank below the floor between the challenge and the
 * acceptance should stop the acceptance.
 */
export async function canArrangeMatch(teamId: string, db: Db = prisma): Promise<boolean> {
  return (await rosterSize(teamId, db)) >= MIN_ROSTER_TO_ARRANGE_MATCH;
}
