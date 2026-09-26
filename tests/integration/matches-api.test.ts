import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as createRoute } from "@/app/api/v1/matches/route";
import { POST as acceptRoute } from "@/app/api/v1/games/[id]/accept/route";
import { POST as declineRoute } from "@/app/api/v1/games/[id]/decline/route";
import { DELETE as cancelRoute } from "@/app/api/v1/games/[id]/route";
import { signAccessToken } from "@/lib/api/tokens";
import { matchStateOf } from "@/lib/services/match-state";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[matches-api] no test database reachable — skipping integration tests");
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

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

/**
 * Two teams arranging a game between themselves.
 *
 * The rules under test are the ones a person would state out loud: only a
 * captain speaks for a team, a team is not a team until it has five people,
 * and an open call belongs to whoever answers first — which is the only place
 * in the flow where two people can genuinely collide.
 */
describe.skipIf(!dbAvailable)("team matches (integration)", () => {
  let homeCaptain: string;
  let awayCaptain: string;
  let thirdCaptain: string;
  let bystander: string;
  let homeTeam: string;
  let awayTeam: string;
  let thirdTeam: string;
  let tinyTeam: string;

  /** A team with `size` members, the first of them captain. */
  async function makeTeam(name: string, phonePrefix: string, size: number) {
    const members = await Promise.all(
      Array.from({ length: size }, (_, i) =>
        prisma.user.create({
          data: { name: `${name} ${i}`, phone: `${phonePrefix}${String(i).padStart(2, "0")}` },
        }),
      ),
    );
    const team = await prisma.team.create({
      data: {
        name,
        members: {
          create: members.map((m, i) => ({ userId: m.id, isCaptain: i === 0 })),
        },
      },
    });
    return { teamId: team.id, captainId: members[0].id, memberIds: members.map((m) => m.id) };
  }

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.user.deleteMany();

    const home = await makeTeam("Ýyldyz", "+9936510", 5);
    const away = await makeTeam("Aşgabat", "+9936511", 5);
    const third = await makeTeam("Köpetdag", "+9936512", 5);
    const tiny = await makeTeam("Bagyr", "+9936513", 4);

    homeTeam = home.teamId;
    homeCaptain = home.captainId;
    awayTeam = away.teamId;
    awayCaptain = away.captainId;
    thirdTeam = third.teamId;
    thirdCaptain = third.captainId;
    tinyTeam = tiny.teamId;
    bystander = away.memberIds[1];
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  function challenge(userId: string, fields: Record<string, unknown> = {}) {
    return authed(`${BASE}/matches`, userId, {
      method: "POST",
      body: JSON.stringify({
        homeTeamId: homeTeam,
        opponentTeamId: awayTeam,
        scheduledAt: tomorrow(),
        fieldName: "Meydan Arena",
        ...fields,
      }),
    });
  }

  async function createdMatchId(userId = homeCaptain, fields: Record<string, unknown> = {}) {
    const response = await createRoute(await challenge(userId, fields));
    expect(response.status).toBe(200);
    return (await body(response)).data.id as string;
  }

  it("a captain challenges another team, and its captain is told", async () => {
    const id = await createdMatchId();

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(match.type).toBe("TEAM_MATCH");
    expect(match.teamId).toBe(homeTeam);
    expect(match.awayTeamId).toBe(awayTeam);
    expect(matchStateOf(match)).toBe("pending");

    const told = await prisma.notification.findMany({ where: { type: "MATCH_CHALLENGE" } });
    expect(told.map((n) => n.userId)).toEqual([awayCaptain]);
  });

  it("nobody is in the line-up until the match is agreed", async () => {
    // A pending challenge is not a fixture yet, and half of them evaporate.
    await createdMatchId();
    expect(await prisma.gameParticipant.count()).toBe(0);
  });

  it("accepting writes both rosters in, with the side each played for", async () => {
    const id = await createdMatchId();

    const response = await acceptRoute(
      await authed(`${BASE}/games/${id}/accept`, awayCaptain, {
        method: "POST",
        body: JSON.stringify({ teamId: awayTeam }),
      }),
      ctx(id),
    );
    expect(response.status).toBe(200);

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(matchStateOf(match)).toBe("agreed");

    const lineup = await prisma.gameParticipant.findMany({ where: { gameId: id } });
    expect(lineup).toHaveLength(10);
    expect(lineup.filter((p) => p.teamId === homeTeam)).toHaveLength(5);
    expect(lineup.filter((p) => p.teamId === awayTeam)).toHaveLength(5);

    const told = await prisma.notification.findMany({ where: { type: "MATCH_ACCEPTED" } });
    expect(told.map((n) => n.userId)).toEqual([homeCaptain]);
  });

  it("declining reads as declined, not as a cancellation", async () => {
    // Both end CANCELLED. Only the timestamp says which, and the home captain
    // calling a match off is a different thing from being turned down.
    const id = await createdMatchId();

    const response = await declineRoute(
      await authed(`${BASE}/games/${id}/decline`, awayCaptain, { method: "POST" }),
      ctx(id),
    );
    expect(response.status).toBe(200);

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(matchStateOf(match)).toBe("declined");
    expect(await prisma.gameParticipant.count()).toBe(0);
  });

  it("the home captain calling it off reads as cancelled", async () => {
    const id = await createdMatchId();

    const response = await cancelRoute(
      await authed(`${BASE}/games/${id}`, homeCaptain, { method: "DELETE" }),
      ctx(id),
    );
    expect(response.status).toBe(200);

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(matchStateOf(match)).toBe("cancelled");
  });

  it("an open call is taken by whoever answers", async () => {
    const id = await createdMatchId(homeCaptain, { opponentTeamId: null });

    const before = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(matchStateOf(before)).toBe("open_call");
    // Nobody was challenged, so nobody was told.
    expect(await prisma.notification.count()).toBe(0);

    await acceptRoute(
      await authed(`${BASE}/games/${id}/accept`, thirdCaptain, {
        method: "POST",
        body: JSON.stringify({ teamId: thirdTeam }),
      }),
      ctx(id),
    );

    const after = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(after.awayTeamId).toBe(thirdTeam);
    expect(matchStateOf(after)).toBe("agreed");
  });

  it("two captains answering one open call: exactly one gets it", async () => {
    // The only real collision in the flow. Without the row lock both read it
    // as free and the second silently replaces the first.
    const id = await createdMatchId(homeCaptain, { opponentTeamId: null });

    const [a, b] = await Promise.all([
      acceptRoute(
        await authed(`${BASE}/games/${id}/accept`, awayCaptain, {
          method: "POST",
          body: JSON.stringify({ teamId: awayTeam }),
        }),
        ctx(id),
      ),
      acceptRoute(
        await authed(`${BASE}/games/${id}/accept`, thirdCaptain, {
          method: "POST",
          body: JSON.stringify({ teamId: thirdTeam }),
        }),
        ctx(id),
      ),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect([awayTeam, thirdTeam]).toContain(match.awayTeamId);
    // Ten, not fifteen: the loser wrote nobody in.
    expect(await prisma.gameParticipant.count()).toBe(10);
  });

  it("a team of four cannot arrange a match", async () => {
    const response = await createRoute(
      await challenge(homeCaptain, { homeTeamId: tinyTeam, opponentTeamId: awayTeam }),
    );

    expect(response.status).toBe(403); // not a captain of that team, checked first
    expect(await prisma.game.count()).toBe(0);
  });

  it("a team of four cannot be challenged either", async () => {
    const response = await createRoute(await challenge(homeCaptain, { opponentTeamId: tinyTeam }));

    expect(response.status).toBe(409);
    expect((await body(response)).error).toBe("roster_too_small");
  });

  it("a team cannot play itself", async () => {
    const response = await createRoute(await challenge(homeCaptain, { opponentTeamId: homeTeam }));

    expect(response.status).toBe(409);
    expect((await body(response)).error).toBe("same_team");
  });

  it("only a captain speaks for a team", async () => {
    const created = await createRoute(await challenge(bystander));
    expect(created.status).toBe(403);

    const id = await createdMatchId();
    const accepted = await acceptRoute(
      await authed(`${BASE}/games/${id}/accept`, bystander, {
        method: "POST",
        body: JSON.stringify({ teamId: awayTeam }),
      }),
      ctx(id),
    );
    expect(accepted.status).toBe(403);
  });

  it("a challenge addressed to someone else is not visible to answer", async () => {
    // Not "already taken" — as far as an unrelated captain is concerned this
    // challenge does not exist, and saying otherwise leaks who was asked.
    const id = await createdMatchId();

    const response = await acceptRoute(
      await authed(`${BASE}/games/${id}/accept`, thirdCaptain, {
        method: "POST",
        body: JSON.stringify({ teamId: thirdTeam }),
      }),
      ctx(id),
    );

    expect(response.status).toBe(404);
  });

  it("an answered challenge cannot be answered twice", async () => {
    const id = await createdMatchId();
    await declineRoute(
      await authed(`${BASE}/games/${id}/decline`, awayCaptain, { method: "POST" }),
      ctx(id),
    );

    const again = await acceptRoute(
      await authed(`${BASE}/games/${id}/accept`, awayCaptain, {
        method: "POST",
        body: JSON.stringify({ teamId: awayTeam }),
      }),
      ctx(id),
    );

    expect(again.status).toBe(409);
  });

  it("a match cannot be arranged for a time that has passed", async () => {
    const response = await createRoute(
      await challenge(homeCaptain, {
        scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
    );

    expect(response.status).toBe(400);
    expect((await body(response)).error).toBe("game_in_past");
  });

  it("the format becomes the label, not a capacity", async () => {
    // totalSpots is NOT NULL and lib/game-format.ts reads "5×5" out of it.
    // Nobody joins a match individually — games.ts refuses — so the number is
    // only ever a label.
    const id = await createdMatchId(homeCaptain, { format: 7 });

    const match = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(match.totalSpots).toBe(14);
  });
});
