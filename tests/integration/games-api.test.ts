import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getFeed } from "@/app/api/v1/games/route";
import { DELETE as cancelRoute, GET as getGame } from "@/app/api/v1/games/[id]/route";
import { DELETE as leaveRoute, POST as joinRoute } from "@/app/api/v1/games/[id]/join/route";
import { GET as getMe, PATCH as patchMe } from "@/app/api/v1/me/route";
import { signAccessToken } from "@/lib/api/tokens";
import { POST as createRoute } from "@/app/api/v1/games/route";
import { closePastGames } from "@/lib/services/game-lifecycle";
import { joinGame } from "@/lib/services/games";
import { getProfileStats } from "@/lib/services/profile-stats";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[games-api] no test database reachable — skipping integration tests");
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

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function makeUser(name: string, phone: string, district = "Berzengi") {
  return prisma.user.create({ data: { name, phone, district } });
}

async function makeGame(organizerId: string, totalSpots: number, fieldId?: string) {
  return prisma.game.create({
    data: {
      organizerId,
      totalSpots,
      scheduledAt: tomorrow(),
      fieldName: "Test pitch",
      fieldId,
      participants: { create: { userId: organizerId } },
    },
  });
}

describe.skipIf(!dbAvailable)("games API (integration)", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.field.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("authentication", () => {
    it("rejects an unauthenticated feed request", async () => {
      const response = await getFeed(new Request(`${BASE}/games`));
      expect(response.status).toBe(401);
    });

    it("rejects an authenticated but un-onboarded user with 403", async () => {
      const user = await makeUser("No Phone", "+99311111111");
      const response = await getFeed(
        await authed(`${BASE}/games`, user.id, { onboarded: false }),
      );
      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("onboarding_required");
    });
  });

  describe("feed", () => {
    it("splits games into open and mine", async () => {
      const me = await makeUser("Me", "+99310000001");
      const other = await makeUser("Other", "+99310000002");
      await makeGame(other.id, 10); // joinable by me
      await makeGame(me.id, 10); // organized by me

      const data = (await body(await getFeed(await authed(`${BASE}/games`, me.id)))).data;

      expect(data.open).toHaveLength(1);
      expect(data.mine).toHaveLength(1);
      expect(data.mine[0].mine).toBe(true);
    });

    it("drops a game out of open once joined", async () => {
      const me = await makeUser("Me", "+99310000001");
      const other = await makeUser("Other", "+99310000002");
      const game = await makeGame(other.id, 10);

      await joinRoute(await authed(`${BASE}/games/${game.id}/join`, me.id, {
        method: "POST",
      }), ctx(game.id));

      const data = (await body(await getFeed(await authed(`${BASE}/games`, me.id)))).data;
      expect(data.open).toHaveLength(0);
      expect(data.mine).toHaveLength(1);
      // Joined, but not the organizer.
      expect(data.mine[0].mine).toBe(false);
    });

    it("excludes games that already happened", async () => {
      const me = await makeUser("Me", "+99310000001");
      const other = await makeUser("Other", "+99310000002");
      await prisma.game.create({
        data: {
          organizerId: other.id,
          totalSpots: 10,
          scheduledAt: new Date(Date.now() - 60_000),
          fieldName: "Yesterday",
        },
      });

      const data = (await body(await getFeed(await authed(`${BASE}/games`, me.id)))).data;
      expect(data.open).toHaveLength(0);
    });
  });

  describe("detail and the organizer-phone privacy gate", () => {
    it("hides the organizer's phone from someone who has not joined", async () => {
      const me = await makeUser("Me", "+99310000001");
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      const data = (
        await body(await getGame(await authed(`${BASE}/games/${game.id}`, me.id), ctx(game.id)))
      ).data;

      expect(data.joined).toBe(false);
      expect(data.organizer.phone).toBeNull();
    });

    it("reveals the organizer's phone once the viewer joins", async () => {
      const me = await makeUser("Me", "+99310000001");
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      const joined = (
        await body(
          await joinRoute(
            await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "POST" }),
            ctx(game.id),
          ),
        )
      ).data;

      expect(joined.joined).toBe(true);
      expect(joined.organizer.phone).toBe("+99399999999");
    });

    it("shows the organizer their own phone", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      const data = (
        await body(
          await getGame(await authed(`${BASE}/games/${game.id}`, organizer.id), ctx(game.id)),
        )
      ).data;

      expect(data.isOrganizer).toBe(true);
      expect(data.organizer.phone).toBe("+99399999999");
    });

    it("404s an unknown game", async () => {
      const me = await makeUser("Me", "+99310000001");
      const response = await getGame(
        await authed(`${BASE}/games/nope`, me.id),
        ctx("nope"),
      );
      expect(response.status).toBe(404);
    });
  });

  describe("joining", () => {
    it("adds the player and returns the updated roster", async () => {
      const me = await makeUser("Me", "+99310000001");
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      const data = (
        await body(
          await joinRoute(
            await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "POST" }),
            ctx(game.id),
          ),
        )
      ).data;

      expect(data.joinedCount).toBe(2);
      expect(data.openSlots).toBe(8);
    });

    it("flips the game to FULL on the last spot", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 2); // organizer already occupies 1

      const data = (
        await body(
          await joinRoute(
            await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "POST" }),
            ctx(game.id),
          ),
        )
      ).data;

      expect(data.isFull).toBe(true);
      expect((await prisma.game.findUnique({ where: { id: game.id } }))!.status).toBe(
        "FULL",
      );
    });

    it("rejects joining a full game with 409", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const filler = await makeUser("Filler", "+99310000009");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 2);
      await joinGame(game.id, filler.id);

      const response = await joinRoute(
        await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "POST" }),
        ctx(game.id),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("game_full");
    });

    it("is idempotent when joining twice", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 10);

      await joinGame(game.id, me.id);
      const second = await joinRoute(
        await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "POST" }),
        ctx(game.id),
      );

      expect(second.status).toBe(200);
      expect((await body(second)).data.joinedCount).toBe(2);
    });

    it("does not mark a game FULL when an existing player re-joins", async () => {
      // Regression: the original computed the new count as `participants + 1`
      // unconditionally, so an existing participant re-joining a 2-of-3 game
      // flipped it to FULL and locked out the last real spot.
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 3);
      await joinGame(game.id, me.id); // 2 of 3

      await joinGame(game.id, me.id); // re-join, still 2 of 3

      const after = await prisma.game.findUnique({ where: { id: game.id } });
      expect(after!.status).toBe("OPEN");
      expect(await prisma.gameParticipant.count({ where: { gameId: game.id } })).toBe(2);
    });

    it("notifies the organizer exactly once", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 10);

      await joinGame(game.id, me.id);
      await joinGame(game.id, me.id); // re-join must not notify again

      const notes = await prisma.notification.findMany({
        where: { userId: organizer.id },
      });
      expect(notes).toHaveLength(1);
      expect(notes[0].type).toBe("PLAYER_JOINED");
    });

    it("does not notify when the organizer joins their own game", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      await joinGame(game.id, organizer.id);

      expect(await prisma.notification.count()).toBe(0);
    });
  });

  describe("capacity under concurrency", () => {
    it("lets exactly one of two racing players take the final spot", async () => {
      // The decisive test for this endpoint. Without a row lock on the game,
      // both transactions read the same participant count under READ
      // COMMITTED, both pass the capacity check, and the game ends up
      // over-booked — someone turns up to a pitch with no spot.
      const organizer = await makeUser("Organizer", "+99399999999");
      const a = await makeUser("A", "+99310000001");
      const b = await makeUser("B", "+99310000002");
      const game = await makeGame(organizer.id, 2); // organizer holds 1 of 2

      const [ra, rb] = await Promise.all([
        joinGame(game.id, a.id),
        joinGame(game.id, b.id),
      ]);

      const winners = [ra, rb].filter((r) => r.ok);
      const losers = [ra, rb].filter((r) => !r.ok);

      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(losers[0]).toEqual({ ok: false, error: "game_full" });

      expect(await prisma.gameParticipant.count({ where: { gameId: game.id } })).toBe(2);
      expect((await prisma.game.findUnique({ where: { id: game.id } }))!.status).toBe(
        "FULL",
      );
    });

    it("never exceeds capacity with many simultaneous joiners", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 5); // 4 spots left
      const players = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          makeUser(`P${i}`, `+9931000${String(i).padStart(4, "0")}`),
        ),
      );

      const results = await Promise.all(players.map((p) => joinGame(game.id, p.id)));

      expect(results.filter((r) => r.ok)).toHaveLength(4);
      expect(await prisma.gameParticipant.count({ where: { gameId: game.id } })).toBe(5);
    });
  });

  describe("leaving", () => {
    it("removes the player and reopens a full game", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 2);
      await joinGame(game.id, me.id); // now FULL

      const data = (
        await body(
          await leaveRoute(
            await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "DELETE" }),
            ctx(game.id),
          ),
        )
      ).data;

      expect(data.joined).toBe(false);
      expect(data.joinedCount).toBe(1);
      expect((await prisma.game.findUnique({ where: { id: game.id } }))!.status).toBe(
        "OPEN",
      );
    });

    it("refuses to let the organizer leave", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const game = await makeGame(organizer.id, 10);

      const response = await leaveRoute(
        await authed(`${BASE}/games/${game.id}/join`, organizer.id, { method: "DELETE" }),
        ctx(game.id),
      );

      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("organizer_cannot_leave");
    });

    it("refuses to leave a completed game, preserving attendance history", async () => {
      const organizer = await makeUser("Organizer", "+99399999999");
      const me = await makeUser("Me", "+99310000001");
      const game = await makeGame(organizer.id, 10);
      await joinGame(game.id, me.id);
      await prisma.game.update({
        where: { id: game.id },
        data: { status: "COMPLETED" },
      });
      await prisma.gameParticipant.updateMany({
        where: { gameId: game.id, userId: me.id },
        data: { attended: true },
      });

      const response = await leaveRoute(
        await authed(`${BASE}/games/${game.id}/join`, me.id, { method: "DELETE" }),
        ctx(game.id),
      );

      expect(response.status).toBe(409);
      // The attendance record survives.
      expect(
        await prisma.gameParticipant.count({ where: { gameId: game.id, attended: true } }),
      ).toBe(1);
    });
  });

  describe("cancelling", () => {
    it("lets the organizer cancel and notifies the other players", async () => {
      const organizer = await makeUser("Organizer", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const game = await makeGame(organizer.id, 6);
      await joinGame(game.id, player.id);

      const response = await cancelRoute(
        await authed(`${BASE}/games/${game.id}`, organizer.id, { method: "DELETE" }),
        ctx(game.id),
      );

      expect(response.status).toBe(200);
      expect((await body(response)).data.status).toBe("CANCELLED");

      const notifications = await prisma.notification.findMany({
        where: { type: "GAME_CANCELLED" },
      });
      // The organizer acted, so only the other player is told.
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(player.id);
    });

    it("refuses to cancel someone else's game", async () => {
      const organizer = await makeUser("Organizer", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const game = await makeGame(organizer.id, 6);
      await joinGame(game.id, player.id);

      const response = await cancelRoute(
        await authed(`${BASE}/games/${game.id}`, player.id, { method: "DELETE" }),
        ctx(game.id),
      );

      expect(response.status).toBe(403);
      expect((await body(response)).error).toBe("not_organizer");

      const after = await prisma.game.findUnique({ where: { id: game.id } });
      expect(after?.status).toBe("OPEN");
    });

    it("refuses to cancel a completed game", async () => {
      const organizer = await makeUser("Organizer", "+99310000001");
      const game = await makeGame(organizer.id, 6);
      await prisma.game.update({
        where: { id: game.id },
        data: { status: "COMPLETED" },
      });

      const response = await cancelRoute(
        await authed(`${BASE}/games/${game.id}`, organizer.id, { method: "DELETE" }),
        ctx(game.id),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("game_over");
    });

    it("is idempotent and does not notify twice", async () => {
      const organizer = await makeUser("Organizer", "+99310000001");
      const player = await makeUser("Player", "+99310000002");
      const game = await makeGame(organizer.id, 6);
      await joinGame(game.id, player.id);

      for (let i = 0; i < 2; i++) {
        const response = await cancelRoute(
          await authed(`${BASE}/games/${game.id}`, organizer.id, { method: "DELETE" }),
          ctx(game.id),
        );
        expect(response.status).toBe(200);
      }

      const notifications = await prisma.notification.findMany({
        where: { type: "GAME_CANCELLED" },
      });
      expect(notifications).toHaveLength(1);
    });

    it("404s an unknown game", async () => {
      const organizer = await makeUser("Organizer", "+99310000001");

      const response = await cancelRoute(
        await authed(`${BASE}/games/missing`, organizer.id, { method: "DELETE" }),
        ctx("missing"),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("profile", () => {
    it("returns the caller's profile without secrets", async () => {
      const me = await prisma.user.create({
        data: { name: "Me", phone: "+99310000001", password: "hash", fcmToken: "tok" },
      });

      const response = await getMe(await authed(`${BASE}/me`, me.id));
      const serialized = JSON.stringify(await body(response));

      expect(response.status).toBe(200);
      expect(serialized).not.toContain("hash");
      expect(serialized).not.toContain("tok");
    });

    it("re-mints the access token when onboarding completes", async () => {
      // Setting a phone completes onboarding, but the caller's token still
      // says otherwise for 15 minutes — without a fresh token the client
      // finishes onboarding and is immediately bounced back into it.
      const me = await prisma.user.create({ data: { name: "New" } });

      const response = await patchMe(
        await authed(`${BASE}/me`, me.id, {
          method: "PATCH",
          body: JSON.stringify({ phone: "12345678" }),
          onboarded: false,
        }),
      );
      const data = (await body(response)).data;

      expect(data.user.onboardingComplete).toBe(true);
      expect(data.accessToken).toBeTruthy();
    });

    it("omits a new token when onboarding status is unchanged", async () => {
      const me = await makeUser("Me", "+99310000001");

      const data = (
        await body(
          await patchMe(
            await authed(`${BASE}/me`, me.id, {
              method: "PATCH",
              body: JSON.stringify({ name: "Renamed" }),
            }),
          ),
        )
      ).data;

      expect(data.user.name).toBe("Renamed");
      expect(data.accessToken).toBeUndefined();
    });

    it("updates the profile-edit fields (skill level and open-to-invite)", async () => {
      const me = await makeUser("Me", "+99310000001");

      const data = (
        await body(
          await patchMe(
            await authed(`${BASE}/me`, me.id, {
              method: "PATCH",
              body: JSON.stringify({
                skillLevel: "ADVANCED",
                isOpenToInvite: false,
              }),
            }),
          ),
        )
      ).data;

      expect(data.user.skillLevel).toBe("ADVANCED");
      expect(data.user.isOpenToInvite).toBe(false);
    });

    it("falls back to BEGINNER for an unknown skill level", async () => {
      const me = await makeUser("Me", "+99310000001");
      // Seed a non-default value so the fallback is an observable overwrite.
      await prisma.user.update({
        where: { id: me.id },
        data: { skillLevel: "ADVANCED" },
      });

      const data = (
        await body(
          await patchMe(
            await authed(`${BASE}/me`, me.id, {
              method: "PATCH",
              body: JSON.stringify({ skillLevel: "WIZARD" }),
            }),
          ),
        )
      ).data;

      expect(data.user.skillLevel).toBe("BEGINNER");
    });

    it("rejects claiming a phone another user already holds", async () => {
      await makeUser("Owner", "+99312345678");
      const me = await prisma.user.create({ data: { name: "Squatter" } });

      const response = await patchMe(
        await authed(`${BASE}/me`, me.id, {
          method: "PATCH",
          body: JSON.stringify({ phone: "12345678" }),
          onboarded: false,
        }),
      );

      expect(response.status).toBe(409);
      expect((await body(response)).error).toBe("phone_taken");
    });
  });

  describe("the game lifecycle", () => {
    // A 21:00 game looked at the next morning used to stay OPEN forever:
    // invisible in every feed (they ask for scheduledAt >= now), absent from
    // anyone's history, and still joinable as far as the API was concerned.
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

    async function playedGame(organizerId: string, hoursSinceKickoff: number) {
      return prisma.game.create({
        data: {
          organizerId,
          totalSpots: 10,
          scheduledAt: hoursAgo(hoursSinceKickoff),
          fieldName: "Test pitch",
          participants: { create: { userId: organizerId } },
        },
      });
    }

    it("refuses to create a game in the past", async () => {
      const user = await makeUser("Organizer", "+99361111111");
      const response = await createRoute(
        await authed(`${BASE}/games`, user.id, {
          method: "POST",
          body: JSON.stringify({
            scheduledAt: hoursAgo(2).toISOString(),
            fieldName: "Yesterday pitch",
            totalSpots: 10,
            neededPositions: [],
          }),
        }),
      );

      expect(response.status).toBe(400);
      expect((await body(response)).error).toBe("game_in_past");
      expect(await prisma.game.count()).toBe(0);
    });

    it("still accepts a game later today", async () => {
      const user = await makeUser("Organizer", "+99361111112");
      const response = await createRoute(
        await authed(`${BASE}/games`, user.id, {
          method: "POST",
          body: JSON.stringify({
            scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            fieldName: "Tonight pitch",
            totalSpots: 10,
            neededPositions: [],
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(await prisma.game.count()).toBe(1);
    });

    it("refuses a join once kickoff has passed, even while the game is still OPEN", async () => {
      const organizer = await makeUser("Organizer", "+99361111113");
      const player = await makeUser("Player", "+99361111114");
      const game = await playedGame(organizer.id, 1);

      const result = await joinGame(game.id, player.id);

      expect(result).toEqual({ ok: false, error: "not_joinable" });
      expect(await prisma.gameParticipant.count({ where: { gameId: game.id } })).toBe(1);
    });

    it("closes a played game and leaves the score empty", async () => {
      const organizer = await makeUser("Organizer", "+99361111115");
      const game = await playedGame(organizer.id, 4);

      expect(await closePastGames()).toMatchObject({ closed: 1 });

      const closed = await prisma.game.findUniqueOrThrow({ where: { id: game.id } });
      expect(closed.status).toBe("COMPLETED");
      expect(closed.scoreHome).toBeNull();
      expect(closed.scoreAway).toBeNull();
    });

    it("leaves a game inside the grace window alone", async () => {
      const organizer = await makeUser("Organizer", "+99361111116");
      const game = await playedGame(organizer.id, 1);

      expect(await closePastGames()).toMatchObject({ closed: 0 });
      expect((await prisma.game.findUniqueOrThrow({ where: { id: game.id } })).status).toBe("OPEN");
    });

    it("does not touch a cancelled game, and is idempotent on a second run", async () => {
      const organizer = await makeUser("Organizer", "+99361111117");
      const cancelled = await playedGame(organizer.id, 5);
      await prisma.game.update({ where: { id: cancelled.id }, data: { status: "CANCELLED" } });
      await playedGame(organizer.id, 5);

      expect(await closePastGames()).toMatchObject({ closed: 1 });
      // A retried or overlapping cron run must close nothing the second time.
      expect(await closePastGames()).toMatchObject({ closed: 0 });
      expect((await prisma.game.findUniqueOrThrow({ where: { id: cancelled.id } })).status)
        .toBe("CANCELLED");
    });

    it("puts a closed game into the player's history", async () => {
      // The point of closing them: profile stats only ever look at COMPLETED
      // games, so before this a played game counted for nobody.
      const organizer = await makeUser("Organizer", "+99361111118");
      await playedGame(organizer.id, 4);
      await closePastGames();

      const stats = await getProfileStats(organizer.id);
      expect(stats.recent).toHaveLength(1);
    });
  });
});
