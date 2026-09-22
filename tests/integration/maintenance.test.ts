import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { purgeExpiredRows } from "@/lib/services/maintenance";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[maintenance] no test database reachable — skipping integration tests");
}

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

describe.skipIf(!dbAvailable)("housekeeping (integration)", () => {
  beforeEach(async () => {
    await prisma.rateLimit.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("drops rate-limit windows that expired more than a day ago", async () => {
    await prisma.rateLimit.createMany({
      data: [
        { key: "login:ip:1.2.3.4", count: 3, expiresAt: daysAgo(2) },
        { key: "login:ip:5.6.7.8", count: 1, expiresAt: daysAgo(30) },
      ],
    });

    expect(await purgeExpiredRows()).toMatchObject({ rateLimits: 2 });
    expect(await prisma.rateLimit.count()).toBe(0);
  });

  it("keeps a window that is still counting, and one that just expired", async () => {
    // The grace matters: a window that expired minutes ago may still be the
    // row the next request upserts into.
    await prisma.rateLimit.createMany({
      data: [
        { key: "create-game:u1", count: 1, expiresAt: new Date(Date.now() + 60_000) },
        { key: "create-game:u2", count: 1, expiresAt: new Date(Date.now() - 60_000) },
      ],
    });

    expect(await purgeExpiredRows()).toMatchObject({ rateLimits: 0 });
    expect(await prisma.rateLimit.count()).toBe(2);
  });

  it("keeps a revoked refresh token until it is long expired", async () => {
    // Presenting a revoked token is how theft is detected — it revokes the
    // whole family — so the row has to outlive the revocation.
    const user = await prisma.user.create({
      data: { name: "Token owner", phone: "+99363000001" },
    });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: "recently-revoked",
        familyId: "family-1",
        revokedAt: new Date(),
        expiresAt: daysAgo(1),
      },
    });

    expect(await purgeExpiredRows()).toMatchObject({ refreshTokens: 0 });
    expect(await prisma.refreshToken.count()).toBe(1);
  });

  it("drops a refresh token a month past its expiry", async () => {
    const user = await prisma.user.create({
      data: { name: "Token owner", phone: "+99363000002" },
    });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: "ancient",
        familyId: "family-2",
        expiresAt: daysAgo(40),
      },
    });

    expect(await purgeExpiredRows()).toMatchObject({ refreshTokens: 1 });
    expect(await prisma.refreshToken.count()).toBe(0);
  });
});
