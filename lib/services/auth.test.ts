import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 9 })),
}));

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { phoneLoginOrSignup } from "./auth";

const findUnique = vi.mocked(prisma.user.findUnique);
const create = vi.mocked(prisma.user.create);
const limiter = vi.mocked(rateLimit);

const base = { password: "hunter22", locale: "ru", ip: "1.2.3.4" };
const allow = async () => ({ allowed: true, remaining: 9 });

beforeEach(() => {
  vi.clearAllMocks();
  limiter.mockImplementation(allow);
});

describe("input validation", () => {
  it("rejects a phone that fails normalization", async () => {
    // 5 digits is neither an 8-digit local number nor a 993-prefixed one.
    const result = await phoneLoginOrSignup({ ...base, phone: "12345" });
    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects an empty password", async () => {
    const result = await phoneLoginOrSignup({
      ...base,
      phone: "12345678",
      password: "",
    });
    expect(result).toEqual({ ok: false, error: "invalid_input" });
  });

  it("normalizes the phone before lookup", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" } as never);

    await phoneLoginOrSignup({ ...base, phone: "  12 34 56 78 " });

    expect(findUnique).toHaveBeenCalledWith({ where: { phone: "+99312345678" } });
  });
});

describe("rate limiting", () => {
  it("applies both an IP and a tighter per-phone limit", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" } as never);

    await phoneLoginOrSignup({ ...base, phone: "12345678" });

    expect(limiter).toHaveBeenCalledWith("login:ip:1.2.3.4", 10, 600_000);
    expect(limiter).toHaveBeenCalledWith("login:phone:+99312345678", 5, 900_000);
  });

  it("blocks when the IP limit is exhausted", async () => {
    limiter.mockImplementation(async (key: string) =>
      key.startsWith("login:ip:")
        ? { allowed: false, remaining: 0 }
        : { allowed: true, remaining: 4 },
    );

    const result = await phoneLoginOrSignup({ ...base, phone: "12345678" });

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("blocks when the per-phone limit is exhausted", async () => {
    limiter.mockImplementation(async (key: string) =>
      key.startsWith("login:phone:")
        ? { allowed: false, remaining: 0 }
        : { allowed: true, remaining: 9 },
    );

    expect(await phoneLoginOrSignup({ ...base, phone: "12345678" })).toEqual({
      ok: false,
      error: "rate_limited",
    });
  });
});

describe("signup (unknown phone)", () => {
  it("enforces an 8-character minimum", async () => {
    findUnique.mockResolvedValue(null);

    const result = await phoneLoginOrSignup({
      ...base,
      phone: "12345678",
      password: "short7!",
    });

    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the account and reports isNewSignup", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "new-user" } as never);

    const result = await phoneLoginOrSignup({
      ...base,
      phone: "12345678",
      locale: "tm",
    });

    expect(result).toEqual({
      ok: true,
      userId: "new-user",
      phone: "+99312345678",
      isNewSignup: true,
    });

    const data = create.mock.calls[0][0].data as unknown as Record<string, string>;
    expect(data.phone).toBe("+99312345678");
    expect(data.name).toBe("+99312345678");
    expect(data.locale).toBe("tm");
    // The password must be hashed, never stored raw.
    expect(data.password).not.toBe("hunter22");
    expect(await bcrypt.compare("hunter22", data.password)).toBe(true);
  });

  it("reports a unique-phone race as wrong_password, not a crash", async () => {
    // Two requests claiming the same number: the loser must get a normal
    // failed-login response. Reporting "already exists" would confirm to an
    // attacker that the number is registered.
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    expect(await phoneLoginOrSignup({ ...base, phone: "12345678" })).toEqual({
      ok: false,
      error: "wrong_password",
    });
  });

  it("rethrows errors that are not the unique-constraint race", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(new Error("connection lost"));

    await expect(phoneLoginOrSignup({ ...base, phone: "12345678" })).rejects.toThrow(
      "connection lost",
    );
  });
});

describe("login (known phone)", () => {
  const userWith = async (password: string | null) => ({
    id: "u1",
    phone: "+99312345678",
    password: password === null ? null : await bcrypt.hash(password, 4),
  });

  it("accepts the correct password", async () => {
    findUnique.mockResolvedValue((await userWith("hunter22")) as never);

    expect(await phoneLoginOrSignup({ ...base, phone: "12345678" })).toEqual({
      ok: true,
      userId: "u1",
      phone: "+99312345678",
      isNewSignup: false,
    });
  });

  it("still accepts a legacy password shorter than the signup floor", async () => {
    // Accounts predating the 8-char rule must keep working. If the floor were
    // applied on login too, those users would be locked out permanently.
    findUnique.mockResolvedValue((await userWith("old123")) as never);

    const result = await phoneLoginOrSignup({
      ...base,
      phone: "12345678",
      password: "old123",
    });

    expect(result).toMatchObject({ ok: true, isNewSignup: false });
  });

  it("rejects a wrong password", async () => {
    findUnique.mockResolvedValue((await userWith("hunter22")) as never);

    expect(
      await phoneLoginOrSignup({ ...base, phone: "12345678", password: "wrongpass" }),
    ).toEqual({ ok: false, error: "wrong_password" });
  });

  it("rejects a passwordless account but still runs a bcrypt compare", async () => {
    // A Google-created account has no password. Returning early without
    // comparing would make this path measurably faster than a wrong-password
    // attempt, leaking which numbers belong to Google accounts.
    findUnique.mockResolvedValue((await userWith(null)) as never);
    const compare = vi.spyOn(bcrypt, "compare");

    const result = await phoneLoginOrSignup({ ...base, phone: "12345678" });

    expect(result).toEqual({ ok: false, error: "wrong_password" });
    expect(compare).toHaveBeenCalledOnce();
    compare.mockRestore();
  });
});
