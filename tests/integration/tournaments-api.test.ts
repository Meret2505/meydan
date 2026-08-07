import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as createRoute } from "@/app/api/v1/tournaments/route";
import {
  DELETE as cancelRoute,
  GET as getTournament,
} from "@/app/api/v1/tournaments/[id]/route";
import { POST as registerRoute } from "@/app/api/v1/tournaments/[id]/teams/route";
import { DELETE as unregisterRoute } from "@/app/api/v1/tournaments/[id]/teams/[teamId]/route";
import { POST as matchRoute } from "@/app/api/v1/tournaments/[id]/matches/route";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[tournaments-api] no test database reachable — skipping");
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
const teamCtx = (id: string, teamId: string) => ({
  params: Promise.resolve({ id, teamId }),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

async function makeUser(name: string, phone: string) {
  return prisma.user.create({ data: { name, phone, district: "Berzengi" } });
}

async function makeTeam(captainId: string, name: string) {
  return prisma.team.create({
    data: {
      name,
      color: "green",
      members: { create: { userId: captainId, isCaptain: true } },
    },
  });
}

async function makeTournament(creatorId: string) {
  return prisma.tournament.create({
    data: { name: "Kubok", startDate: new Date(), creatorId },
  });
}

describe.skipIf(!dbAvailable)("tournaments API (integration)", () => {
  beforeEach(async () => {
    await prisma.tournamentMatch.deleteMany();
    await prisma.tournamentTeam.deleteMany();
    await prisma.tournament.deleteMany();
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

  describe("creating and cancelling", () => {
    const iso = (daysFromNow: number) =>
      new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

    it("creates a tournament with the caller as creator", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await createRoute(
        await authed(`${BASE}/tournaments`, me.id, {
          method: "POST",
          body: JSON.stringify({
            name: "Kubok 2026",
            startDate: iso(7),
            description: "Bahar kubogy",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.name).toBe("Kubok 2026");
      expect(data.description).toBe("Bahar kubogy");
      expect(data.isCreator).toBe(true);
    });

    it("rejects a one-character name and a bad date", async () => {
      const me = await makeUser("Me", "+99310000001");

      for (const payload of [
        { name: "K", startDate: iso(1) },
        { name: "Kubok", startDate: "not-a-date" },
      ]) {
        const response = await createRoute(
          await authed(`${BASE}/tournaments`, me.id, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
        );
        expect(response.status).toBe(400);
      }

      expect(await prisma.tournament.count()).toBe(0);
    });

    it("rejects an end date before the start", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await createRoute(
        await authed(`${BASE}/tournaments`, me.id, {
          method: "POST",
          body: JSON.stringify({
            name: "Kubok",
            startDate: iso(7),
            endDate: iso(1),
          }),
        }),
      );

      expect(response.status).toBe(400);
    });

    it("lets the creator cancel", async () => {
      const creator = await makeUser("Creator", "+99310000001");
      const tournament = await makeTournament(creator.id);

      const response = await cancelRoute(
        await authed(`${BASE}/tournaments/${tournament.id}`, creator.id, {
          method: "DELETE",
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(200);
      expect((await body(response)).data.status).toBe("cancelled");
    });

    it("refuses a cancel by anyone else", async () => {
      const creator = await makeUser("Creator", "+99310000001");
      const stranger = await makeUser("Stranger", "+99310000002");
      const tournament = await makeTournament(creator.id);

      const response = await cancelRoute(
        await authed(`${BASE}/tournaments/${tournament.id}`, stranger.id, {
          method: "DELETE",
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(403);
      const after = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });
      expect(after?.cancelled).toBe(false);
    });

    it("is idempotent when cancelling twice", async () => {
      const creator = await makeUser("Creator", "+99310000001");
      const tournament = await makeTournament(creator.id);

      for (let i = 0; i < 2; i++) {
        const response = await cancelRoute(
          await authed(`${BASE}/tournaments/${tournament.id}`, creator.id, {
            method: "DELETE",
          }),
          ctx(tournament.id),
        );
        expect(response.status).toBe(200);
      }
    });
  });

  describe("registering teams", () => {
    it("lets a captain enter their team", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id, "Ýyldyz");
      const tournament = await makeTournament(captain.id);

      const response = await registerRoute(
        await authed(`${BASE}/tournaments/${tournament.id}/teams`, captain.id, {
          method: "POST",
          body: JSON.stringify({ teamId: team.id }),
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.teams).toHaveLength(1);
      expect(data.myTeams).toEqual([
        { id: team.id, name: "Ýyldyz", registered: true },
      ]);
    });

    it("refuses entry by a non-captain", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const member = await makeUser("Member", "+99310000002");
      const team = await makeTeam(captain.id, "Ýyldyz");
      await prisma.teamMember.create({ data: { teamId: team.id, userId: member.id } });
      const tournament = await makeTournament(captain.id);

      const response = await registerRoute(
        await authed(`${BASE}/tournaments/${tournament.id}/teams`, member.id, {
          method: "POST",
          body: JSON.stringify({ teamId: team.id }),
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(403);
      expect(await prisma.tournamentTeam.count()).toBe(0);
    });

    it("is idempotent — entering twice keeps one registration", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id, "Ýyldyz");
      const tournament = await makeTournament(captain.id);

      for (let i = 0; i < 2; i++) {
        const response = await registerRoute(
          await authed(`${BASE}/tournaments/${tournament.id}/teams`, captain.id, {
            method: "POST",
            body: JSON.stringify({ teamId: team.id }),
          }),
          ctx(tournament.id),
        );
        expect(response.status).toBe(200);
      }

      expect(await prisma.tournamentTeam.count()).toBe(1);
    });

    it("withdraws a team", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id, "Ýyldyz");
      const tournament = await makeTournament(captain.id);
      await prisma.tournamentTeam.create({
        data: { tournamentId: tournament.id, teamId: team.id },
      });

      const response = await unregisterRoute(
        await authed(
          `${BASE}/tournaments/${tournament.id}/teams/${team.id}`,
          captain.id,
          { method: "DELETE" },
        ),
        teamCtx(tournament.id, team.id),
      );

      expect(response.status).toBe(200);
      expect((await body(response)).data.teams).toHaveLength(0);
      expect(await prisma.tournamentTeam.count()).toBe(0);
    });

    it("refuses entry into a cancelled tournament", async () => {
      const captain = await makeUser("Captain", "+99310000001");
      const team = await makeTeam(captain.id, "Ýyldyz");
      const tournament = await makeTournament(captain.id);
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: { cancelled: true },
      });

      const response = await registerRoute(
        await authed(`${BASE}/tournaments/${tournament.id}/teams`, captain.id, {
          method: "POST",
          body: JSON.stringify({ teamId: team.id }),
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(409);
    });
  });

  describe("recording results", () => {
    async function setup() {
      const creator = await makeUser("Creator", "+99310000001");
      const home = await makeTeam(creator.id, "Ýyldyz");
      const away = await makeTeam(creator.id, "Galkan");
      const tournament = await makeTournament(creator.id);
      await prisma.tournamentTeam.createMany({
        data: [
          { tournamentId: tournament.id, teamId: home.id },
          { tournamentId: tournament.id, teamId: away.id },
        ],
      });
      return { creator, home, away, tournament };
    }

    const post = (t: string, u: string, payload: unknown) =>
      authed(`${BASE}/tournaments/${t}/matches`, u, {
        method: "POST",
        body: JSON.stringify(payload),
      });

    it("records a result and updates the standings", async () => {
      const { creator, home, away, tournament } = await setup();

      const response = await matchRoute(
        await post(tournament.id, creator.id, {
          homeTeamId: home.id,
          awayTeamId: away.id,
          scoreHome: 3,
          scoreAway: 1,
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(200);
      const data = (await body(response)).data;
      expect(data.matches).toHaveLength(1);

      const winner = data.standings.find(
        (r: { teamId: string }) => r.teamId === home.id,
      );
      expect(winner.points).toBe(3);
      expect(winner.goalsFor).toBe(3);
    });

    it("does not duplicate an identical double-submit", async () => {
      // A double tap used to insert a second match row, which then
      // double-counted in the standings.
      const { creator, home, away, tournament } = await setup();
      const payload = {
        homeTeamId: home.id,
        awayTeamId: away.id,
        scoreHome: 2,
        scoreAway: 2,
      };

      for (let i = 0; i < 2; i++) {
        const response = await matchRoute(
          await post(tournament.id, creator.id, payload),
          ctx(tournament.id),
        );
        expect(response.status).toBe(200);
      }

      expect(await prisma.tournamentMatch.count()).toBe(1);
    });

    it("still records a second leg with a different score", async () => {
      // Idempotency must not swallow a genuine rematch.
      const { creator, home, away, tournament } = await setup();

      for (const scoreAway of [1, 2]) {
        await matchRoute(
          await post(tournament.id, creator.id, {
            homeTeamId: home.id,
            awayTeamId: away.id,
            scoreHome: 3,
            scoreAway,
          }),
          ctx(tournament.id),
        );
      }

      expect(await prisma.tournamentMatch.count()).toBe(2);
    });

    it("refuses a result from someone who is not the creator", async () => {
      const { home, away, tournament } = await setup();
      const stranger = await makeUser("Stranger", "+99310000009");

      const response = await matchRoute(
        await post(tournament.id, stranger.id, {
          homeTeamId: home.id,
          awayTeamId: away.id,
          scoreHome: 9,
          scoreAway: 0,
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(403);
      expect(await prisma.tournamentMatch.count()).toBe(0);
    });

    it("rejects a negative or absurd score", async () => {
      const { creator, home, away, tournament } = await setup();

      for (const scores of [
        { scoreHome: -1, scoreAway: 0 },
        { scoreHome: 1000, scoreAway: 0 },
      ]) {
        const response = await matchRoute(
          await post(tournament.id, creator.id, {
            homeTeamId: home.id,
            awayTeamId: away.id,
            ...scores,
          }),
          ctx(tournament.id),
        );
        expect(response.status).toBe(400);
      }

      expect(await prisma.tournamentMatch.count()).toBe(0);
    });

    it("rejects a team playing itself", async () => {
      const { creator, home, tournament } = await setup();

      const response = await matchRoute(
        await post(tournament.id, creator.id, {
          homeTeamId: home.id,
          awayTeamId: home.id,
          scoreHome: 1,
          scoreAway: 1,
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(400);
    });

    it("rejects a match between unregistered teams", async () => {
      const { creator, home, tournament } = await setup();
      const outsider = await makeTeam(creator.id, "Outsider");

      const response = await matchRoute(
        await post(tournament.id, creator.id, {
          homeTeamId: home.id,
          awayTeamId: outsider.id,
          scoreHome: 1,
          scoreAway: 0,
        }),
        ctx(tournament.id),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("teams_not_registered");
    });
  });

  describe("detail", () => {
    it("reports creator context to the creator only", async () => {
      const creator = await makeUser("Creator", "+99310000001");
      const other = await makeUser("Other", "+99310000002");
      const tournament = await makeTournament(creator.id);

      const mine = await getTournament(
        await authed(`${BASE}/tournaments/${tournament.id}`, creator.id),
        ctx(tournament.id),
      );
      const theirs = await getTournament(
        await authed(`${BASE}/tournaments/${tournament.id}`, other.id),
        ctx(tournament.id),
      );

      expect((await body(mine)).data.isCreator).toBe(true);
      expect((await body(theirs)).data.isCreator).toBe(false);
    });
  });
});
