import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as createTeamRoute } from "@/app/api/v1/teams/route";
import { POST as createGameRoute } from "@/app/api/v1/games/route";
import { signAccessToken } from "@/lib/api/tokens";
import { purgeExpiredRows } from "@/lib/services/maintenance";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[idempotency] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(
  url: string,
  userId: string,
  init: RequestInit & { key?: string } = {},
) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  const { key, ...rest } = init;
  return new Request(url, {
    ...rest,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(key ? { "idempotency-key": key } : {}),
      ...(rest.headers ?? {}),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

const teamRequest = (userId: string, name: string, key?: string) =>
  authed(`${BASE}/teams`, userId, {
    method: "POST",
    key,
    body: JSON.stringify({ name, color: "green", district: "Berzengi" }),
  });

/**
 * A create request on the other guarded endpoint, used only to prove a key is
 * not answerable across endpoints. Two hours out so it is never in the past.
 */
const gameRequest = (userId: string, key?: string) =>
  authed(`${BASE}/games`, userId, {
    method: "POST",
    key,
    body: JSON.stringify({
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      fieldName: "Meydan Arena",
      totalSpots: 10,
      neededPositions: [],
    }),
  });

describe.skipIf(!dbAvailable)("idempotent creates (integration)", () => {
  let userId: string;
  let otherId: string;

  beforeEach(async () => {
    await prisma.idempotencyKey.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.user.deleteMany();

    const [a, b] = await Promise.all([
      prisma.user.create({
        data: { name: "Meret", phone: "+99365000001", district: "Berzengi" },
      }),
      prisma.user.create({
        data: { name: "Aman", phone: "+99365000002", district: "Berzengi" },
      }),
    ]);
    userId = a.id;
    otherId = b.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates once when the same key is sent twice, and replays the first answer", async () => {
    // The case this whole mechanism exists for: the first response was lost on
    // the way back, so the client asks again with the key it already used.
    const key = "b8f1c4de-0b31-4a41-9e02-7c6f0a1d2e3b";

    const first = await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));
    const second = await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await prisma.team.count()).toBe(1);

    const [a, b] = [await body(first), await body(second)];
    expect(b).toEqual(a);
    expect(b.data.id).toBe(a.data.id);
  });

  it("creates twice without a key, exactly as it did before", async () => {
    // Every already-installed copy of the app sends no key. The endpoint must
    // stay usable for them rather than becoming a 400.
    await createTeamRoute(await teamRequest(userId, "Ýyldyz"));
    await createTeamRoute(await teamRequest(userId, "Ýyldyz"));

    expect(await prisma.team.count()).toBe(2);
  });

  it("creates twice for two different keys", async () => {
    // A key is per submit, not per user: someone really making two teams gets
    // two teams.
    await createTeamRoute(await teamRequest(userId, "Ýyldyz", "key-one-aaaaaaaa"));
    await createTeamRoute(await teamRequest(userId, "Aşgabat", "key-two-bbbbbbbb"));

    expect(await prisma.team.count()).toBe(2);
  });

  it("lets two people use the same key independently", async () => {
    const key = "same-key-for-both-users";

    await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));
    await createTeamRoute(await teamRequest(otherId, "Aşgabat", key));

    expect(await prisma.team.count()).toBe(2);
  });

  it("frees the key when the attempt failed, so a corrected retry works", async () => {
    // A rejected submit created nothing, so its key must not answer for the
    // fixed one — otherwise a validation error would be permanent.
    const key = "retry-after-failure-key";

    const rejected = await createTeamRoute(
      await authed(`${BASE}/teams`, userId, {
        method: "POST",
        key,
        body: JSON.stringify({ name: "x" }), // one character: the service refuses
      }),
    );
    expect(rejected.status).toBe(400);
    expect(await prisma.idempotencyKey.count()).toBe(0);

    const retried = await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));
    expect(retried.status).toBe(200);
    expect(await prisma.team.count()).toBe(1);
  });

  it("refuses a key already spent on another endpoint", async () => {
    const key = "one-key-two-endpoints-x";

    await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));
    const crossed = await createGameRoute(await gameRequest(userId, key));

    expect(crossed.status).toBe(409);
    expect((await body(crossed)).error).toBe("idempotency_key_reused");
    expect(await prisma.game.count()).toBe(0);
  });

  it("tells a repeat that arrives mid-flight to ask again", async () => {
    // A claim with no response yet is the in-flight state. Written directly
    // because reproducing the race in-process would just be a sleep.
    const key = "in-flight-key-aaaaaaaa";
    await prisma.idempotencyKey.create({
      data: { userId, key, endpoint: "create-team" },
    });

    const response = await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));

    expect(response.status).toBe(409);
    expect((await body(response)).error).toBe("request_in_progress");
    expect(await prisma.team.count()).toBe(0);
  });

  it("rejects a key too short or with whitespace in it", async () => {
    for (const key of ["short", "has a space in it", " ".repeat(12)]) {
      const response = await createTeamRoute(await teamRequest(userId, "Ýyldyz", key));
      expect(response.status).toBe(400);
      expect((await body(response)).error).toBe("invalid_idempotency_key");
    }
    expect(await prisma.team.count()).toBe(0);
  });

  it("purges keys once they are a day old, and keeps today's", async () => {
    await prisma.idempotencyKey.createMany({
      data: [
        {
          userId,
          key: "stale-key-aaaaaaaaaaa",
          endpoint: "create-team",
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        { userId, key: "fresh-key-bbbbbbbbbbb", endpoint: "create-team" },
      ],
    });

    expect(await purgeExpiredRows()).toMatchObject({ idempotencyKeys: 1 });
    expect(await prisma.idempotencyKey.count()).toBe(1);
  });
});
