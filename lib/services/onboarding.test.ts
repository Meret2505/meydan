import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { updateOnboardingProfile } from "./onboarding";

const findUnique = vi.mocked(prisma.user.findUnique);
const update = vi.mocked(prisma.user.update);

const dataOf = () => update.mock.calls[0][0].data as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({} as never);
  findUnique.mockResolvedValue(null);
});

describe("field validation", () => {
  it("trims and saves a name", async () => {
    expect(await updateOnboardingProfile("u1", { name: "  Merdan  " })).toEqual({
      ok: true,
    });
    expect(dataOf().name).toBe("Merdan");
  });

  it("rejects a blank name without writing", async () => {
    expect(await updateOnboardingProfile("u1", { name: "   " })).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("accepts a valid position and rejects anything else", async () => {
    expect(await updateOnboardingProfile("u1", { position: "GOALKEEPER" })).toEqual({
      ok: true,
    });
    expect(await updateOnboardingProfile("u1", { position: "STRIKER" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("accepts only supported locales", async () => {
    expect(await updateOnboardingProfile("u1", { locale: "tm" })).toEqual({ ok: true });
    expect(await updateOnboardingProfile("u1", { locale: "de" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("clears an unparseable age rather than failing", async () => {
    // parseAge has always been nullable: a bad value nulls the field instead
    // of blocking the rest of the patch.
    expect(await updateOnboardingProfile("u1", { age: "not-a-number" })).toEqual({
      ok: true,
    });
    expect(dataOf().age).toBeNull();
  });

  it("keeps an in-range age", async () => {
    await updateOnboardingProfile("u1", { age: "27" });
    expect(dataOf().age).toBe(27);
  });

  it("rejects the whole patch when any field is invalid", async () => {
    const result = await updateOnboardingProfile("u1", {
      name: "Merdan",
      district: "   ",
    });
    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(update).not.toHaveBeenCalled();
  });

  it("is a no-op for an empty patch", async () => {
    expect(await updateOnboardingProfile("u1", {})).toEqual({ ok: true });
    expect(update).not.toHaveBeenCalled();
  });

  it("applies several fields at once", async () => {
    await updateOnboardingProfile("u1", {
      name: "Merdan",
      district: "Berzengi",
      position: "FORWARD",
      locale: "tm",
    });
    expect(dataOf()).toMatchObject({
      name: "Merdan",
      district: "Berzengi",
      position: "FORWARD",
      locale: "tm",
    });
  });
});

describe("phone claiming", () => {
  it("normalizes before saving", async () => {
    await updateOnboardingProfile("u1", { phone: "12 34 56 78" });
    expect(dataOf().phone).toBe("+99312345678");
  });

  it("rejects an unnormalizable phone", async () => {
    expect(await updateOnboardingProfile("u1", { phone: "123" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a number already held by someone else", async () => {
    // Squatting a victim's number would break their phone login.
    findUnique.mockResolvedValue({ id: "someone-else" } as never);

    expect(await updateOnboardingProfile("u1", { phone: "12345678" })).toEqual({
      ok: false,
      error: "phone_taken",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("allows re-saving a number the user already holds", async () => {
    findUnique.mockResolvedValue({ id: "u1" } as never);
    expect(await updateOnboardingProfile("u1", { phone: "12345678" })).toEqual({
      ok: true,
    });
  });

  it("reports a lost unique-phone race as phone_taken, not a crash", async () => {
    // Regression: the pre-check is not atomic, so two users can both pass it.
    // This previously threw an unhandled P2002 and surfaced as an error page.
    findUnique.mockResolvedValue(null);
    update.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    expect(await updateOnboardingProfile("u1", { phone: "12345678" })).toEqual({
      ok: false,
      error: "phone_taken",
    });
  });

  it("rethrows errors that are not the unique-phone race", async () => {
    update.mockRejectedValue(new Error("connection lost"));
    await expect(updateOnboardingProfile("u1", { name: "Merdan" })).rejects.toThrow(
      "connection lost",
    );
  });
});
