import { PrismaClient, Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getFieldDetail } from "@/app/api/v1/fields/[id]/route";
import { signAccessToken } from "@/lib/api/tokens";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[field-detail-api] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(userId: string) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(`${BASE}/fields/x`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

/**
 * `hours`, `contacts` and `attributes` are filled in by hand in the database —
 * approveFieldSubmission leaves them for a person to add afterwards — and the
 * serializer used to cast them straight to a TypeScript type. A cast checks
 * nothing, so an object typed where an array belongs reached `.map` and the
 * endpoint answered 500: the pitch page was simply dead in the app, with
 * "internal" as the only clue.
 *
 * These write the mistakes directly, the way the table editor would.
 */
describe.skipIf(!dbAvailable)("field detail with hand-edited JSON (integration)", () => {
  let userId: string;

  beforeEach(async () => {
    await prisma.fieldFavorite.deleteMany();
    await prisma.field.deleteMany();
    await prisma.user.deleteMany();
    const user = await prisma.user.create({
      data: { name: "Viewer", phone: "+99364000900", district: "Berzengi" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function makeField(json: {
    hours?: Prisma.InputJsonValue;
    contacts?: Prisma.InputJsonValue;
    attributes?: Prisma.InputJsonValue;
  }) {
    return prisma.field.create({
      data: {
        name: "Meydan Arena",
        address: "просп. Махтумкули 16",
        district: "Berzengi",
        surface: "Искусственная трава",
        capacity: 12,
        isActive: true,
        ...json,
      },
    });
  }

  it("serves the pitch when every JSON column holds the wrong shape", async () => {
    const field = await makeField({
      // Each of these is an object where the reader expects an array, or the
      // other way round — the slip that produced the 500.
      contacts: { type: "phone", value: "+99365000001" },
      attributes: { "1": "Раздевалка" },
      hours: ["09:00-23:00"],
    });

    const response = await getFieldDetail(await authed(userId), ctx(field.id));

    expect(response.status).toBe(200);
    const payload = await body(response);
    expect(payload.data.contacts).toEqual([]);
    expect(payload.data.amenities).toEqual([]);
    expect(payload.data.hours).toBeNull();
  });

  it("keeps the good entries and drops only the bad ones", async () => {
    const field = await makeField({
      contacts: [
        { type: "phone", value: "+99365000001" },
        { type: "telegram", value: "meydan" },
      ],
      attributes: [
        { code: 1, ru: "Раздевалка", tm: "Geýim otagy" },
        { code: "2", ru: "Душ", tm: "Duş" },
      ],
    });

    const payload = await body(await getFieldDetail(await authed(userId), ctx(field.id)));

    expect(payload.data.contacts).toEqual([{ type: "phone", value: "+99365000001" }]);
    expect(payload.data.amenities).toEqual([{ ru: "Раздевалка", tm: "Geýim otagy" }]);
  });

  it("returns a full week, closed where a day is missing or misspelled", async () => {
    const field = await makeField({
      hours: {
        monday: { isOpen: true, start: "08:00", end: "23:00" },
        Tuesday: { isOpen: true, start: "08:00", end: "23:00" },
      },
    });

    const payload = await body(await getFieldDetail(await authed(userId), ctx(field.id)));

    expect(payload.data.hours).toHaveLength(7);
    expect(payload.data.hours[0]).toEqual({
      day: "monday",
      isOpen: true,
      start: "08:00",
      end: "23:00",
    });
    // Capitalised, so nothing reads it — the day shows closed rather than
    // taking the whole column down.
    expect(payload.data.hours[1]).toEqual({
      day: "tuesday",
      isOpen: false,
      start: "",
      end: "",
    });
  });

  it("serves a pitch whose metadata was never filled in", async () => {
    const field = await makeField({});

    const payload = await body(await getFieldDetail(await authed(userId), ctx(field.id)));

    expect(payload.data.hours).toBeNull();
    expect(payload.data.contacts).toEqual([]);
    expect(payload.data.amenities).toEqual([]);
  });
});
