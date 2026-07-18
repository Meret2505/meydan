import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as loginPhone } from "@/app/api/v1/auth/phone/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { verifyAccessToken } from "@/lib/api/tokens";

/**
 * End-to-end coverage of the auth surface against a real Postgres.
 *
 * Route handlers are plain (Request) => Promise<Response> functions, so they
 * are invoked directly here — no HTTP server needed, and the whole stack still
 * runs for real: Zod parsing, the service layer, Prisma, and token minting.
 *
 * Requires the throwaway database from docker-compose.test.yml (or any local
 * Postgres pointed at by .env.test). The suite skips itself when none is
 * reachable, so `npm test` stays green on a machine without one.
 */

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[auth-api] no test database reachable — skipping integration tests");
}

const post = (url: string, body: unknown, ip = "10.0.0.1") =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

const PHONE_URL = "https://meydan.test/api/v1/auth/phone";

type Json = Record<string, never> & {
  success: boolean;
  error?: string;
  data?: Record<string, string> & { user: Record<string, string> };
};

const json = (response: Response) => response.json() as Promise<Json>;

describe.skipIf(!dbAvailable)("auth API (integration)", () => {
  beforeEach(async () => {
    // Order matters: refresh_tokens has an FK to users.
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rateLimit.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("signs up an unknown phone and issues a usable session", async () => {
    const response = await loginPhone(
      post(PHONE_URL, { phone: "12345678", password: "hunter22", locale: "tm" }),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data!.isNewSignup).toBe(true);

    // The access token must actually verify and carry the right subject.
    const claims = await verifyAccessToken(body.data!.accessToken);
    expect(claims).not.toBeNull();
    expect(claims!.userId).toBe(body.data!.user.id);

    // The account really landed, with a normalized phone and a hashed password.
    const user = await prisma.user.findUnique({ where: { phone: "+99312345678" } });
    expect(user).not.toBeNull();
    expect(user!.locale).toBe("tm");
    expect(user!.password).not.toBe("hunter22");
  });

  it("never returns the password hash or fcm token", async () => {
    const response = await loginPhone(
      post(PHONE_URL, { phone: "12345678", password: "hunter22" }),
    );
    const serialized = JSON.stringify(await json(response));

    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("fcmToken");
    expect(serialized).not.toContain("$2a$");
  });

  it("stores only the hash of the refresh token", async () => {
    const body = await json(
      await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" })),
    );

    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(body.data!.refreshToken);
    expect(rows[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("logs the same phone back in without creating a second account", async () => {
    await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" }));
    const second = await json(
      await loginPhone(post(PHONE_URL, { phone: "+99312345678", password: "hunter22" })),
    );

    expect(second.data!.isNewSignup).toBe(false);
    expect(await prisma.user.count()).toBe(1);
  });

  it("rejects a wrong password with 401", async () => {
    await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" }));
    const response = await loginPhone(
      post(PHONE_URL, { phone: "12345678", password: "not-the-password" }),
    );

    expect(response.status).toBe(401);
    expect((await json(response)).error).toBe("wrong_password");
  });

  it("rejects a short password on signup with 400", async () => {
    const response = await loginPhone(post(PHONE_URL, { phone: "12345678", password: "short" }));

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("enforces the per-phone rate limit", async () => {
    // 5 attempts per phone per 15 minutes. Vary the IP so the (looser) 10/IP
    // limit is not what trips first.
    await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" }));

    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        await loginPhone(
          post(PHONE_URL, { phone: "12345678", password: "wrongpass" }, `10.0.1.${i}`),
        ),
      );
    }

    expect(attempts.at(-1)!.status).toBe(429);
    expect((await json(attempts.at(-1)!)).error).toBe("rate_limited");
  });

  it("rotates the refresh token and invalidates the old one", async () => {
    const first = await json(
      await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" })),
    );
    const original = first.data!.refreshToken;

    const rotated = await json(
      await refresh(post("https://meydan.test/api/v1/auth/refresh", { refreshToken: original })),
    );

    expect(rotated.success).toBe(true);
    expect(rotated.data!.refreshToken).not.toBe(original);
    // The new access token verifies.
    expect(await verifyAccessToken(rotated.data!.accessToken)).not.toBeNull();

    // Replaying the original now fails.
    const replay = await refresh(
      post("https://meydan.test/api/v1/auth/refresh", { refreshToken: original }),
    );
    expect(replay.status).toBe(401);
  });

  it("revokes the whole family when a spent token is replayed", async () => {
    const first = await json(
      await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" })),
    );
    const original = first.data!.refreshToken;

    const rotated = await json(
      await refresh(post("https://meydan.test/api/v1/auth/refresh", { refreshToken: original })),
    );

    // Attacker replays the spent token...
    await refresh(post("https://meydan.test/api/v1/auth/refresh", { refreshToken: original }));

    // ...which must also kill the victim's current token.
    const victim = await refresh(
      post("https://meydan.test/api/v1/auth/refresh", {
        refreshToken: rotated.data!.refreshToken,
      }),
    );
    expect(victim.status).toBe(401);

    const live = await prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(live).toBe(0);
  });

  it("rejects an unknown refresh token", async () => {
    const response = await refresh(
      post("https://meydan.test/api/v1/auth/refresh", { refreshToken: "made-up" }),
    );
    expect(response.status).toBe(401);
    expect((await json(response)).error).toBe("invalid_refresh_token");
  });

  it("logs out by revoking the refresh token", async () => {
    const session = await json(
      await loginPhone(post(PHONE_URL, { phone: "12345678", password: "hunter22" })),
    );
    const token = session.data!.refreshToken;

    const response = await logout(
      post("https://meydan.test/api/v1/auth/logout", { refreshToken: token }),
    );
    expect(response.status).toBe(200);

    // The token no longer refreshes.
    const after = await refresh(
      post("https://meydan.test/api/v1/auth/refresh", { refreshToken: token }),
    );
    expect(after.status).toBe(401);
  });

  it("reports success when logging out an unknown token", async () => {
    // Probing which tokens exist must not be possible.
    const response = await logout(
      post("https://meydan.test/api/v1/auth/logout", { refreshToken: "never-existed" }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects a malformed body with 400", async () => {
    const response = await loginPhone(
      new Request(PHONE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
    expect((await json(response)).error).toBe("invalid_input");
  });
});
