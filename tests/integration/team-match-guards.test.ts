import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as joinRoute, DELETE as leaveRoute } from "@/app/api/v1/games/[id]/join/route";
import { POST as resultRoute } from "@/app/api/v1/games/[id]/result/route";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[team-match-guards] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(url: string, userId: string, init: RequestInit = {}) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

/**
 * A team match is a `Game` row, so every endpoint that takes a game id can be
 * aimed at one. Nothing in the app offers these actions on a match — but a
 * notification's `gameId` in an older build deep-links straight to the game
 * detail screen, which renders a match as an ordinary game and puts a Join
 * button on it.
 *
 * Joining would insert a participant and, with a small enough `totalSpots`,
 * flip the row to FULL — which the state model reads as "both teams agreed".
 * That is silent corruption with no error anywhere, so these guards go in
 * before any code can create a match at all.
 */
describe.skipIf(!dbAvailable)("team matches refuse individual-game actions", () => {
  let outsiderId: string;
  let matchId: string;

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    const [home, away, outsider] = await Promise.all([
      prisma.user.create({ data: { name: "Home captain", phone: "+99365001001" } }),
      prisma.user.create({ data: { name: "Away captain", phone: "+99365001002" } }),
      prisma.user.create({ data: { name: "Passer-by", phone: "+99365001003" } }),
    ]);
    outsiderId = outsider.id;

    const homeTeam = await prisma.team.create({
      data: { name: "Ýyldyz", members: { create: { userId: home.id, isCaptain: true } } },
    });
    const awayTeam = await prisma.team.create({
      data: { name: "Aşgabat", members: { create: { userId: away.id, isCaptain: true } } },
    });

    const match = await prisma.game.create({
      data: {
        type: "TEAM_MATCH",
        organizerId: home.id,
        teamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        agreedAt: new Date(),
        status: "FULL",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // Small on purpose: if the guard were missing, one join would fill it
        // and the row would read as "agreed" for the wrong reason.
        totalSpots: 2,
        fieldName: "Meydan Arena",
      },
    });
    matchId = match.id;
  });

  afterAll(async () => {
    // Left behind, these rows outlive the file: the next suite's beforeEach
    // only truncates users and fields, and a team still referencing a user
    // turns its cleanup into a foreign-key error. Tidy up after ourselves
    // rather than making every other file know about teams.
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("refuses a join, and adds nobody", async () => {
    const response = await joinRoute(
      await authed(`${BASE}/games/${matchId}/join`, outsiderId, { method: "POST" }),
      ctx(matchId),
    );

    expect(response.status).toBe(409);
    expect((await body(response)).error).toBe("game_not_joinable");
    expect(await prisma.gameParticipant.count()).toBe(0);
  });

  it("does not let a join flip the match to FULL by the back door", async () => {
    await joinRoute(
      await authed(`${BASE}/games/${matchId}/join`, outsiderId, { method: "POST" }),
      ctx(matchId),
    );

    const after = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });
    expect(after.agreedAt).not.toBeNull();
    expect(await prisma.gameParticipant.count()).toBe(0);
  });

  it("refuses a leave", async () => {
    const response = await leaveRoute(
      await authed(`${BASE}/games/${matchId}/join`, outsiderId, { method: "DELETE" }),
      ctx(matchId),
    );

    expect(response.status).toBe(409);
    expect((await body(response)).error).toBe("game_over");
  });

  it("refuses the ordinary result path even to the organizer", async () => {
    // The home captain is also `organizerId` on this row — the one person the
    // old check would have let through. A match's score goes through its own
    // service, with two captains and a confirmation step.
    const past = await prisma.game.update({
      where: { id: matchId },
      data: { scheduledAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const response = await resultRoute(
      await authed(`${BASE}/games/${past.id}/result`, past.organizerId, {
        method: "POST",
        body: JSON.stringify({ scoreHome: 3, scoreAway: 1 }),
      }),
      ctx(past.id),
    );

    expect(response.status).toBe(403);
    const after = await prisma.game.findUniqueOrThrow({ where: { id: past.id } });
    expect(after.scoreHome).toBeNull();
    expect(after.scoreAway).toBeNull();
  });

  it("leaves ordinary games alone", async () => {
    // The guards key on `type`, so the path everyone actually uses must be
    // untouched — this is the test that fails if the branch is inverted.
    const organizer = await prisma.user.findFirstOrThrow({
      where: { phone: "+99365001001" },
    });
    const game = await prisma.game.create({
      data: {
        organizerId: organizer.id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalSpots: 10,
        fieldName: "Meydan Arena",
      },
    });

    const response = await joinRoute(
      await authed(`${BASE}/games/${game.id}/join`, outsiderId, { method: "POST" }),
      ctx(game.id),
    );

    expect(response.status).toBe(200);
    expect(await prisma.gameParticipant.count()).toBe(1);
  });
});
