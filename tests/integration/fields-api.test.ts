import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getFields } from "@/app/api/v1/fields/route";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[fields-api] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(userId: string, etag?: string) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(`${BASE}/fields`, {
    headers: {
      authorization: `Bearer ${token}`,
      ...(etag ? { "if-none-match": etag } : {}),
    },
  });
}

describe.skipIf(!dbAvailable)("fields API (integration)", () => {
  beforeEach(async () => {
    await prisma.fieldFavorite.deleteMany();
    await prisma.field.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seed() {
    const user = await prisma.user.create({
      data: { name: "Viewer", phone: "+99364000001", district: "Berzengi" },
    });
    await prisma.field.create({
      data: {
        name: "Meydan Arena",
        address: "просп. Махтумкули 16",
        district: "Berzengi",
        surface: "Искусственная трава",
        capacity: 12,
        isActive: true,
        // Columns a card never shows: they must not come back in the payload.
        photos: ["https://example.test/one.jpg"],
        hours: { mon: "09:00-23:00" },
        latitude: 37.9,
        longitude: 58.3,
      },
    });
    return user;
  }

  it("re-answers an unchanged catalogue with a bodiless 304", async () => {
    // The catalogue changes maybe weekly and was re-downloaded in full on
    // every app start, on connections where the body is the expensive part.
    const user = await seed();

    const first = await getFields(await authed(user.id));
    expect(first.status).toBe(200);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();

    const second = await getFields(await authed(user.id, etag!));
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("sends the body again once a pitch is added", async () => {
    const user = await seed();
    const etag = (await getFields(await authed(user.id))).headers.get("etag")!;

    await prisma.field.create({
      data: {
        name: "Second pitch",
        address: "ул. Тестовая 2",
        district: "Anev",
        surface: "Грунт",
        capacity: 8,
        isActive: true,
      },
    });

    expect((await getFields(await authed(user.id, etag))).status).toBe(200);
  });

  it("never sends columns a card does not draw", async () => {
    const user = await seed();

    const body = await (await getFields(await authed(user.id))).json();
    const card = body.data.fields[0];

    expect(Object.keys(card).sort()).toEqual(
      ["capacity", "district", "favorite", "id", "name", "nameRu", "nameTm", "photo", "surface"],
    );
  });
});
