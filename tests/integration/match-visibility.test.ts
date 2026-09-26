import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as feedRoute } from "@/app/api/v1/games/route";
import { GET as detailRoute } from "@/app/api/v1/games/[id]/route";
import { GET as notificationsRoute } from "@/app/api/v1/notifications/route";
import { FEATURE_HEADER, FEATURE_TEAM_MATCHES } from "@/lib/api/client-features";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[match-visibility] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

/** `features: false` is an installed build that predates team matches. */
async function authed(url: string, userId: string, features = true) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(url, {
    headers: {
      authorization: `Bearer ${token}`,
      ...(features ? { [FEATURE_HEADER]: String(FEATURE_TEAM_MATCHES) } : {}),
    },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

/**
 * Who sees a match, and who is protected from one.
 *
 * Two separate questions that share a fixture. The first is the version
 * gate: a build that has never heard of a match draws it as an ordinary game
 * with a Join button, and there are three ways one can reach such a build —
 * the feed, a deep link to the detail, and a notification row.
 *
 * The second is the bucketing. A pending challenge is deliberately asymmetric:
 * the captain being asked has to see it, their squad does not, because they
 * cannot act on it and half of these evaporate on a decline.
 */
describe.skipIf(!dbAvailable)("match visibility (integration)", () => {
  let homeCaptain: string;
  let homeSquad: string;
  let awayCaptain: string;
  let awaySquad: string;
  let stranger: string;
  let homeTeam: string;
  let awayTeam: string;
  let matchId: string;

  async function makeTeam(name: string, prefix: string) {
    const members = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.user.create({
          data: {
            name: `${name} ${i}`,
            phone: `${prefix}${String(i).padStart(2, "0")}`,
            district: "Berzengi",
          },
        }),
      ),
    );
    const team = await prisma.team.create({
      data: {
        name,
        members: { create: members.map((m, i) => ({ userId: m.id, isCaptain: i === 0 })) },
      },
    });
    return { teamId: team.id, ids: members.map((m) => m.id) };
  }

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    const home = await makeTeam("Ýyldyz", "+9936520");
    const away = await makeTeam("Aşgabat", "+9936521");
    const outsider = await prisma.user.create({
      data: { name: "Nobody", phone: "+99365229", district: "Berzengi" },
    });

    homeTeam = home.teamId;
    [homeCaptain, homeSquad] = home.ids;
    awayTeam = away.teamId;
    [awayCaptain, awaySquad] = away.ids;
    stranger = outsider.id;

    const match = await prisma.game.create({
      data: {
        type: "TEAM_MATCH",
        organizerId: homeCaptain,
        teamId: homeTeam,
        awayTeamId: awayTeam,
        scheduledAt: tomorrow(),
        totalSpots: 10,
        fieldName: "Meydan Arena",
      },
    });
    matchId = match.id;
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

  async function feedFor(userId: string, features = true) {
    const payload = await body(await feedRoute(await authed(`${BASE}/games`, userId, features)));
    return {
      open: payload.data.open.map((g: { id: string }) => g.id) as string[],
      mine: payload.data.mine.map((g: { id: string }) => g.id) as string[],
    };
  }

  describe("the version gate", () => {
    it("keeps matches out of an older build's feed", async () => {
      expect((await feedFor(homeCaptain, false)).mine).not.toContain(matchId);
      expect((await feedFor(homeCaptain, true)).mine).toContain(matchId);
    });

    it("answers 404 when an older build follows a deep link to one", async () => {
      // The tap that would otherwise render a match as an ordinary game with
      // a Join button on it.
      const old = await detailRoute(
        await authed(`${BASE}/games/${matchId}`, homeCaptain, false),
        ctx(matchId),
      );
      const current = await detailRoute(
        await authed(`${BASE}/games/${matchId}`, homeCaptain, true),
        ctx(matchId),
      );

      expect(old.status).toBe(404);
      expect(current.status).toBe(200);
    });

    it("hides match notifications from an older build", async () => {
      // The third and least obvious leak: a row lands in the inbox whatever
      // the client version, and tapping it is leak two.
      await prisma.notification.create({
        data: {
          userId: awayCaptain,
          type: "MATCH_CHALLENGE",
          title: "Вызов на матч",
          body: "Другая команда зовёт вас сыграть.",
          data: { gameId: matchId },
        },
      });

      const old = await body(
        await notificationsRoute(await authed(`${BASE}/notifications`, awayCaptain, false)),
      );
      const current = await body(
        await notificationsRoute(await authed(`${BASE}/notifications`, awayCaptain, true)),
      );

      expect(old.data.notifications).toHaveLength(0);
      expect(current.data.notifications).toHaveLength(1);
    });

    it("leaves ordinary games visible to both", async () => {
      const game = await prisma.game.create({
        data: {
          organizerId: stranger,
          scheduledAt: tomorrow(),
          totalSpots: 10,
          fieldName: "Meydan Arena",
        },
      });

      expect((await feedFor(homeSquad, false)).open).toContain(game.id);
      expect((await feedFor(homeSquad, true)).open).toContain(game.id);
    });
  });

  describe("who sees a pending challenge", () => {
    it("shows it to both captains", async () => {
      expect((await feedFor(homeCaptain)).mine).toContain(matchId);
      expect((await feedFor(awayCaptain)).mine).toContain(matchId);
    });

    it("shows it to the home squad, whose captain arranged it", async () => {
      expect((await feedFor(homeSquad)).mine).toContain(matchId);
    });

    it("hides it from the challenged squad until it is agreed", async () => {
      // They cannot act on it, and a "you have a match" that evaporates on a
      // decline is worse than silence.
      expect((await feedFor(awaySquad)).mine).not.toContain(matchId);

      await prisma.game.update({
        where: { id: matchId },
        data: { agreedAt: new Date(), status: "FULL" },
      });

      expect((await feedFor(awaySquad)).mine).toContain(matchId);
    });

    it("hides it from everyone else, in both buckets", async () => {
      const feed = await feedFor(stranger);
      expect(feed.open).not.toContain(matchId);
      expect(feed.mine).not.toContain(matchId);
    });
  });

  describe("who sees an open call", () => {
    beforeEach(async () => {
      await prisma.game.update({ where: { id: matchId }, data: { awayTeamId: null } });
    });

    it("offers it to anyone outside the calling team", async () => {
      // Shown to players as well as captains: hiding it would make the
      // feature invisible to exactly the people who might form a team to
      // answer it. The card explains who may act.
      expect((await feedFor(stranger)).open).toContain(matchId);
      expect((await feedFor(awaySquad)).open).toContain(matchId);
    });

    it("keeps it out of the calling team's open bucket, and in their own", async () => {
      const feed = await feedFor(homeSquad);
      expect(feed.open).not.toContain(matchId);
      expect(feed.mine).toContain(matchId);
    });

    it("drops it from the feed once it has been called off", async () => {
      await prisma.game.update({
        where: { id: matchId },
        data: { status: "CANCELLED" },
      });

      const feed = await feedFor(stranger);
      expect(feed.open).not.toContain(matchId);
    });
  });

  it("tells the client which side it is on", async () => {
    const payload = await body(
      await detailRoute(await authed(`${BASE}/games/${matchId}`, awayCaptain), ctx(matchId)),
    );

    expect(payload.data.type).toBe("TEAM_MATCH");
    expect(payload.data.viewerSide).toBe("AWAY");
    expect(payload.data.viewerIsCaptain).toBe(true);
    expect(payload.data.matchState).toBe("pending");
    expect(payload.data.homeTeam.name).toBe("Ýyldyz");
    expect(payload.data.awayTeam.name).toBe("Aşgabat");
  });

  it("does not call a squad member a captain", async () => {
    const payload = await body(
      await detailRoute(await authed(`${BASE}/games/${matchId}`, homeSquad), ctx(matchId)),
    );

    expect(payload.data.viewerSide).toBe("HOME");
    expect(payload.data.viewerIsCaptain).toBe(false);
  });
});
