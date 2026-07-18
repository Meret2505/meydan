import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "@/lib/api/tokens";

/**
 * Refresh-token lifecycle for native clients: issue, rotate, revoke.
 *
 * Tokens rotate on every use. The plaintext value is returned to the caller
 * exactly once, at creation; only its SHA-256 hash is ever persisted.
 */

export type RotateResult =
  | { ok: true; userId: string; refreshToken: string }
  | { ok: false; error: "invalid_refresh_token" };

/**
 * Issues a token. Omit `familyId` to start a new family (a fresh login);
 * pass one to continue an existing chain (a rotation).
 */
export async function issueRefreshToken(
  userId: string,
  familyId: string = randomUUID(),
): Promise<{ refreshToken: string; familyId: string }> {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId,
      familyId,
      expiresAt: refreshTokenExpiry(),
    },
  });
  return { refreshToken, familyId };
}

/**
 * Exchanges a refresh token for a fresh one, invalidating the presented value.
 *
 * Failure is always reported as a flat `invalid_refresh_token`: distinguishing
 * "expired" from "revoked" from "never existed" would tell an attacker holding
 * a stolen token whether it was ever real.
 */
export async function rotateRefreshToken(presented: string): Promise<RotateResult> {
  const tokenHash = hashRefreshToken(presented);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return { ok: false, error: "invalid_refresh_token" };

  // Reuse of an already-rotated token: the client should have discarded it, so
  // possession implies it leaked. Revoke the whole family — the attacker's
  // chain and the victim's both die, and the victim re-authenticates.
  if (existing.revokedAt) {
    await revokeFamily(existing.familyId);
    return { ok: false, error: "invalid_refresh_token" };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "invalid_refresh_token" };
  }

  // Claim the rotation atomically. Two concurrent refreshes with the same
  // token would otherwise both succeed and mint two live tokens; the
  // conditional update lets exactly one win.
  //
  // The loser is rejected but the family is deliberately NOT revoked: this is
  // what a benign double-submit looks like (two requests racing a 401), and
  // the winner's new token is still valid, so the client recovers on its own.
  // Genuine reuse is caught by the revokedAt branch above.
  const claimed = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, error: "invalid_refresh_token" };

  const next = await issueRefreshToken(existing.userId, existing.familyId);
  return { ok: true, userId: existing.userId, refreshToken: next.refreshToken };
}

/** Revokes a single token. Used at logout. Unknown tokens are a silent no-op. */
export async function revokeRefreshToken(presented: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(presented), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every live token in a family. */
export async function revokeFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every live token for a user, across all devices. */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
