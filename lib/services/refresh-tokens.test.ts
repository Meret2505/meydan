import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { hashRefreshToken } from "@/lib/api/tokens";
import {
  issueRefreshToken,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./refresh-tokens";

const create = vi.mocked(prisma.refreshToken.create);
const findUnique = vi.mocked(prisma.refreshToken.findUnique);
const updateMany = vi.mocked(prisma.refreshToken.updateMany);

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({} as never);
  updateMany.mockResolvedValue({ count: 1 } as never);
});

describe("issueRefreshToken", () => {
  it("persists only the hash, never the token itself", async () => {
    const { refreshToken } = await issueRefreshToken("u1");

    const data = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.tokenHash).toBe(hashRefreshToken(refreshToken));
    expect(JSON.stringify(data)).not.toContain(refreshToken);
  });

  it("starts a new family by default", async () => {
    const a = await issueRefreshToken("u1");
    const b = await issueRefreshToken("u1");
    expect(a.familyId).not.toBe(b.familyId);
  });

  it("continues an existing family when one is supplied", async () => {
    const { familyId } = await issueRefreshToken("u1", "fam-1");
    expect(familyId).toBe("fam-1");
    expect((create.mock.calls[0][0].data as Record<string, unknown>).familyId).toBe(
      "fam-1",
    );
  });
});

describe("rotateRefreshToken", () => {
  it("rejects an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    expect(await rotateRefreshToken("nope")).toEqual({
      ok: false,
      error: "invalid_refresh_token",
    });
  });

  it("rejects an expired token", async () => {
    findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam-1",
      revokedAt: null,
      expiresAt: past(),
    } as never);

    expect(await rotateRefreshToken("stale")).toMatchObject({ ok: false });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("revokes the whole family when an already-rotated token is replayed", async () => {
    // Replay of a spent token means it leaked: kill the attacker's chain and
    // the victim's together, forcing a clean re-authentication.
    findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam-1",
      revokedAt: past(),
      expiresAt: future(),
    } as never);

    expect(await rotateRefreshToken("leaked")).toMatchObject({ ok: false });
    expect(updateMany).toHaveBeenCalledWith({
      where: { familyId: "fam-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rotates a valid token and keeps it in the same family", async () => {
    findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam-1",
      revokedAt: null,
      expiresAt: future(),
    } as never);

    const result = await rotateRefreshToken("valid");

    expect(result).toMatchObject({ ok: true, userId: "u1" });
    // Old token revoked conditionally...
    expect(updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashRefreshToken("valid"), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // ...and the replacement stays in the family.
    expect((create.mock.calls[0][0].data as Record<string, unknown>).familyId).toBe(
      "fam-1",
    );
  });

  it("issues a token different from the one presented", async () => {
    findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam-1",
      revokedAt: null,
      expiresAt: future(),
    } as never);

    const result = await rotateRefreshToken("valid");
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.refreshToken).not.toBe("valid");
  });

  it("fails the loser of a concurrent rotation without nuking the family", async () => {
    // Two requests racing the same 401 is benign, not theft. The winner's new
    // token is still good, so the client recovers — logging it out would be
    // the wrong response to its own retry.
    findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam-1",
      revokedAt: null,
      expiresAt: future(),
    } as never);
    updateMany.mockResolvedValue({ count: 0 } as never);

    expect(await rotateRefreshToken("contended")).toEqual({
      ok: false,
      error: "invalid_refresh_token",
    });
    // Only the failed conditional claim — no family-wide revocation.
    expect(updateMany).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("revocation", () => {
  it("revokes a single token by hash", async () => {
    await revokeRefreshToken("bye");
    expect(updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashRefreshToken("bye"), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revokes every live token for a user", async () => {
    await revokeAllForUser("u1");
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
