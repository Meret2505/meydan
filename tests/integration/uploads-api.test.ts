import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  DELETE as removeAvatarRoute,
  POST as uploadAvatarRoute,
} from "@/app/api/v1/me/avatar/route";
import { GET as statsRoute } from "@/app/api/v1/me/stats/route";
import { signAccessToken } from "@/lib/api/tokens";
import { removeFieldPhoto } from "@/lib/services/uploads";
import { storage } from "@/lib/storage";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[uploads-api] no test database reachable — skipping");
}

const BASE = "https://meydan.test/api/v1";

/** A 1x1 PNG, enough to be a real non-empty image payload. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function authedForm(userId: string, file: File | null) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request(`${BASE}/me/avatar`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
}

async function authed(url: string, userId: string, init: RequestInit = {}) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

async function makeUser(name: string, phone: string) {
  return prisma.user.create({ data: { name, phone, district: "Berzengi" } });
}

describe.skipIf(!dbAvailable)("uploads + profile stats (integration)", () => {
  beforeEach(async () => {
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.field.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("avatar upload", () => {
    it("stores an image and points the user at it", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await uploadAvatarRoute(
        await authedForm(me.id, new File([PNG], "me.png", { type: "image/png" })),
      );

      expect(response.status).toBe(200);
      expect((await body(response)).data.avatar).toBeTruthy();

      const after = await prisma.user.findUnique({ where: { id: me.id } });
      expect(after?.avatar).toBeTruthy();
    });

    it("rejects a non-image type", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await uploadAvatarRoute(
        await authedForm(
          me.id,
          new File([Buffer.from("#!/bin/sh")], "x.sh", { type: "text/x-sh" }),
        ),
      );

      expect(response.status).toBe(400);
      const after = await prisma.user.findUnique({ where: { id: me.id } });
      expect(after?.avatar).toBeNull();
    });

    it("rejects a request with no file", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await uploadAvatarRoute(await authedForm(me.id, null));

      expect(response.status).toBe(400);
    });

    it("deletes the stored object when the avatar is removed", async () => {
      // The old behaviour nulled the column and orphaned the file forever.
      const me = await makeUser("Me", "+99310000001");
      await uploadAvatarRoute(
        await authedForm(me.id, new File([PNG], "me.png", { type: "image/png" })),
      );
      const uploaded = (await prisma.user.findUnique({ where: { id: me.id } }))!.avatar!;

      const removed: string[] = [];
      const realRemove = storage.remove;
      storage.remove = async (bucket, path) => {
        removed.push(`${bucket}/${path}`);
        return realRemove.call(storage, bucket, path);
      };

      try {
        const response = await removeAvatarRoute(
          await authed(`${BASE}/me/avatar`, me.id, { method: "DELETE" }),
        );
        expect(response.status).toBe(200);
      } finally {
        storage.remove = realRemove;
      }

      const after = await prisma.user.findUnique({ where: { id: me.id } });
      expect(after?.avatar).toBeNull();
      expect(removed).toHaveLength(1);
      expect(uploaded).toContain(removed[0].split("/").slice(1).join("/"));
    });

    it("replacing an avatar cleans up the previous object", async () => {
      const me = await makeUser("Me", "+99310000001");
      await uploadAvatarRoute(
        await authedForm(me.id, new File([PNG], "one.png", { type: "image/png" })),
      );

      const removed: string[] = [];
      const realRemove = storage.remove;
      storage.remove = async (bucket, path) => {
        removed.push(path);
        return realRemove.call(storage, bucket, path);
      };

      try {
        await uploadAvatarRoute(
          await authedForm(me.id, new File([PNG], "two.png", { type: "image/png" })),
        );
      } finally {
        storage.remove = realRemove;
      }

      expect(removed).toHaveLength(1);
    });
  });

  describe("removing a field photo", () => {
    it("does not drop a photo uploaded during the removal", async () => {
      // The old implementation replaced the whole array from a stale read, so a
      // concurrent upload vanished. Simulate that interleaving directly.
      const admin = await prisma.user.create({
        data: { name: "Admin", phone: "+99361110000", district: "Berzengi", isAdmin: true },
      });
      const adminId = admin.id;

      const field = await prisma.field.create({
        data: {
          name: "Olimp",
          district: "Berzengi",
          address: "Berzengi, 1",
          surface: "artificial",
          capacity: 10,
          photos: ["https://example.test/a.jpg", "https://example.test/b.jpg"],
        },
      });

      // Append a third photo the way uploadFieldPhoto does (atomic push), then
      // remove the first. Both survivors must remain.
      await prisma.field.update({
        where: { id: field.id },
        data: { photos: { push: "https://example.test/c.jpg" } },
      });

      const result = await removeFieldPhoto(
        adminId,
        field.id,
        "https://example.test/a.jpg",
      );
      expect(result.ok).toBe(true);

      const after = await prisma.field.findUnique({ where: { id: field.id } });
      expect(after?.photos).toEqual([
        "https://example.test/b.jpg",
        "https://example.test/c.jpg",
      ]);
    });

    it("refuses a non-admin", async () => {
      const field = await prisma.field.create({
        data: {
          name: "Olimp",
          district: "Berzengi",
          address: "Berzengi, 1",
          surface: "artificial",
          capacity: 10,
          photos: ["https://x/a.jpg"],
        },
      });

      const result = await removeFieldPhoto("not-an-admin", field.id, "https://x/a.jpg");

      expect(result).toEqual({ ok: false, error: "forbidden" });
      const after = await prisma.field.findUnique({ where: { id: field.id } });
      expect(after?.photos).toHaveLength(1);
    });
  });

  describe("profile stats", () => {
    it("reports attendance and the most recent completed games", async () => {
      const me = await makeUser("Me", "+99310000001");

      const past = (days: number) => new Date(Date.now() - days * 86_400_000);
      for (const [i, attended] of [true, true, false].entries()) {
        const game = await prisma.game.create({
          data: {
            organizerId: me.id,
            totalSpots: 10,
            scheduledAt: past(i + 1),
            fieldName: `Pitch ${i}`,
            status: "COMPLETED",
          },
        });
        await prisma.gameParticipant.create({
          data: { gameId: game.id, userId: me.id, attended },
        });
      }

      const response = await statsRoute(await authed(`${BASE}/me/stats`, me.id));
      const data = (await body(response)).data;

      expect(response.status).toBe(200);
      expect(data.totalJoined).toBe(3);
      expect(data.gamesPlayed).toBe(2);
      expect(data.attendanceRate).toBe(67); // 2/3 rounded
      expect(data.recent).toHaveLength(3);
      expect(data.recent[0].venue).toBeTruthy();
    });

    it("returns a null rate for a player with no marked games", async () => {
      const me = await makeUser("Me", "+99310000001");

      const response = await statsRoute(await authed(`${BASE}/me/stats`, me.id));
      const data = (await body(response)).data;

      expect(data.attendanceRate).toBeNull();
      expect(data.gamesPlayed).toBe(0);
      expect(data.recent).toEqual([]);
    });
  });
});
