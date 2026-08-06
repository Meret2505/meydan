import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getTeams, POST as createRoute } from "@/app/api/v1/teams/route";
import {
  DELETE as disbandRoute,
  GET as getTeam,
} from "@/app/api/v1/teams/[id]/route";
import { DELETE as removeMemberRoute } from "@/app/api/v1/teams/[id]/members/[userId]/route";
import {
  DELETE as leaveRoute,
  POST as joinRoute,
} from "@/app/api/v1/teams/[id]/members/route";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[teams-api] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(
  url: string,
  userId: string,
  init: RequestInit & { onboarded?: boolean } = {},
) {
  const token = await signAccessToken({
    userId,
    onboardingComplete: init.onboarded ?? true,
  });
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

async function makeUser(name: string, phone: string) {
  return prisma.user.create({ data: { name, phone, district: "Berzengi" } });
}

async function makeTeam(captainId: string, name = "Ýyldyz") {
  return prisma.team.create({
    data: {
      name,
      color: "green",
      members: { create: { userId: captainId, isCaptain: true } },
    },
  });
}

describe.skipIf(!dbAvailable)("teams API (integration)", () => {
  beforeEach(async () => {
    // Order matters: games reference both teams and users, and none of those
    // FKs cascade.
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("creating", () => {
    it("creates a team with the caller as captain", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await createRoute(
        await authed(`${BASE}/teams`, me.id, {
          method: "POST",
          body: JSON.stringify({ name: "Ýyldyz", district: "Parahat", color: "blue" }),
        }),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.name).toBe("Ýyldyz");
      expect(data.district).toBe("Parahat");
      expect(data.color).toBe("blue");
      expect(data.isCaptain).toBe(true);
      expect(data.isMember).toBe(true);
      expect(data.memberCount).toBe(1);
    });

    it("rejects a one-character name", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await createRoute(
        await authed(`${BASE}/teams`, me.id, {
          method: "POST",
          body: JSON.stringify({ name: "Ý" }),
        }),
      );

      expect(response.status).toBe(400);
      expect(await prisma.team.count()).toBe(0);
    });

    it("falls back to green for an unknown colour", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await createRoute(
        await authed(`${BASE}/teams`, me.id, {
          method: "POST",
          body: JSON.stringify({ name: "Ýyldyz", color: "chartreuse" }),
        }),
      );

      expect((await body(response)).data.color).toBe("green");
    });
  });

  describe("joining and leaving", () => {
    it("joins a team and reports membership back", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const me = await makeUser("Me", "+99310000002");
      const team = await makeTeam(captain.id);

      const response = await joinRoute(
        await authed(`${BASE}/teams/${team.id}/members`, me.id, { method: "POST" }),
        ctx(team.id),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.isMember).toBe(true);
      expect(data.isCaptain).toBe(false);
      expect(data.memberCount).toBe(2);
    });

    it("is idempotent — joining twice does not duplicate membership", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const me = await makeUser("Me", "+99310000002");
      const team = await makeTeam(captain.id);

      for (let i = 0; i < 2; i++) {
        const response = await joinRoute(
          await authed(`${BASE}/teams/${team.id}/members`, me.id, { method: "POST" }),
          ctx(team.id),
        );
        expect(response.status).toBe(200);
      }

      expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(2);
    });

    it("leaves a team", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const me = await makeUser("Me", "+99310000002");
      const team = await makeTeam(captain.id);
      await prisma.teamMember.create({ data: { teamId: team.id, userId: me.id } });

      const response = await leaveRoute(
        await authed(`${BASE}/teams/${team.id}/members`, me.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.isMember).toBe(false);
      expect(data.memberCount).toBe(1);
    });

    it("refuses to let the captain leave", async () => {
      // There is no captain hand-off anywhere in the product, so a captain
      // leaving would strand the team with nobody able to manage it.
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id);

      const response = await leaveRoute(
        await authed(`${BASE}/teams/${team.id}/members`, captain.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("captain_cannot_leave");
      expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(1);
    });

    it("409s leaving a team you are not on", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const stranger = await makeUser("Stranger", "+99310000002");
      const team = await makeTeam(captain.id);

      const response = await leaveRoute(
        await authed(`${BASE}/teams/${team.id}/members`, stranger.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("not_member");
    });

    it("404s an unknown team", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await joinRoute(
        await authed(`${BASE}/teams/missing/members`, me.id, { method: "POST" }),
        ctx("missing"),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("captain management", () => {
    const memberCtx = (id: string, userId: string) => ({
      params: Promise.resolve({ id, userId }),
    });

    it("lets the captain remove a member", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const team = await makeTeam(captain.id);
      await prisma.teamMember.create({ data: { teamId: team.id, userId: player.id } });

      const response = await removeMemberRoute(
        await authed(`${BASE}/teams/${team.id}/members/${player.id}`, captain.id, {
          method: "DELETE",
        }),
        memberCtx(team.id, player.id),
      );

      expect(response.status).toBe(200);
      expect((await body(response)).data.memberCount).toBe(1);
    });

    it("refuses to let the captain remove themselves", async () => {
      // Same captain-vacancy hole as leaving, reached a different way.
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id);

      const response = await removeMemberRoute(
        await authed(`${BASE}/teams/${team.id}/members/${captain.id}`, captain.id, {
          method: "DELETE",
        }),
        memberCtx(team.id, captain.id),
      );

      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("cannot_remove_self");
      expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(1);
    });

    it("refuses removal by a non-captain", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const other = await makeUser("Other", "+99310000003");
      const team = await makeTeam(captain.id);
      await prisma.teamMember.create({ data: { teamId: team.id, userId: player.id } });
      await prisma.teamMember.create({ data: { teamId: team.id, userId: other.id } });

      const response = await removeMemberRoute(
        await authed(`${BASE}/teams/${team.id}/members/${player.id}`, other.id, {
          method: "DELETE",
        }),
        memberCtx(team.id, player.id),
      );

      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("not_captain");
    });

    it("disbands an unused team", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const team = await makeTeam(captain.id);
      await prisma.teamMember.create({ data: { teamId: team.id, userId: player.id } });

      const response = await disbandRoute(
        await authed(`${BASE}/teams/${team.id}`, captain.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(200);
      expect(await prisma.team.count()).toBe(0);
      expect(await prisma.teamMember.count()).toBe(0);
    });

    it("refuses to disband a team that has games", async () => {
      // Game.teamId has no onDelete: Cascade — deleting anyway raises an FK
      // error, so this guard is load-bearing, not cosmetic.
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id);
      await prisma.game.create({
        data: {
          organizerId: captain.id,
          teamId: team.id,
          totalSpots: 10,
          scheduledAt: new Date(Date.now() + 86_400_000),
          fieldName: "Test pitch",
        },
      });

      const response = await disbandRoute(
        await authed(`${BASE}/teams/${team.id}`, captain.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("team_in_use");
      expect(await prisma.team.count()).toBe(1);
    });

    it("refuses to disband by a non-captain", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const team = await makeTeam(captain.id);
      await prisma.teamMember.create({ data: { teamId: team.id, userId: player.id } });

      const response = await disbandRoute(
        await authed(`${BASE}/teams/${team.id}`, player.id, { method: "DELETE" }),
        ctx(team.id),
      );

      expect(response.status).toBe(403);
      expect(await prisma.team.count()).toBe(1);
    });
  });

  describe("detail and listing", () => {
    it("reports no membership for a non-member viewer", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const stranger = await makeUser("Stranger", "+99310000002");
      const team = await makeTeam(captain.id);

      const response = await getTeam(
        await authed(`${BASE}/teams/${team.id}`, stranger.id),
        ctx(team.id),
      );

      const data = (await body(response)).data;
      expect(data.isMember).toBe(false);
      expect(data.isCaptain).toBe(false);
    });

    it("puts a created team in the caller's own bucket", async () => {
      const me = await makeUser("Me", "+99310000001");
      await makeTeam(me.id);

      const response = await getTeams(await authed(`${BASE}/teams`, me.id));
      const data = (await body(response)).data;

      expect(data.mine).toHaveLength(1);
      expect(data.others).toHaveLength(0);
    });
  });
});
