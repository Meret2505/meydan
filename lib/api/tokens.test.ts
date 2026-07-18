import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyAccessToken,
  REFRESH_TOKEN_TTL_DAYS,
} from "./tokens";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

describe("access tokens", () => {
  it("round-trips claims", async () => {
    const token = await signAccessToken({ userId: "u1", onboardingComplete: true });
    expect(await verifyAccessToken(token)).toEqual({
      userId: "u1",
      onboardingComplete: true,
    });
  });

  it("preserves onboardingComplete: false", async () => {
    // Regression guard: a falsy claim must survive the round-trip, otherwise a
    // half-onboarded user would be treated as complete and skip onboarding.
    const token = await signAccessToken({ userId: "u1", onboardingComplete: false });
    expect(await verifyAccessToken(token)).toEqual({
      userId: "u1",
      onboardingComplete: false,
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = await new SignJWT({ onboardingComplete: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setIssuer("meydan")
      .setAudience("meydan-mobile")
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("a-different-secret"));

    expect(await verifyAccessToken(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ onboardingComplete: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setIssuer("meydan")
      .setAudience("meydan-mobile")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret());

    expect(await verifyAccessToken(expired)).toBeNull();
  });

  it("rejects a token minted for another audience", async () => {
    // Guards against a token from some future surface (e.g. a partner API)
    // being replayed against the mobile endpoints.
    const wrongAudience = await new SignJWT({ onboardingComplete: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setIssuer("meydan")
      .setAudience("someone-else")
      .setExpirationTime("15m")
      .sign(secret());

    expect(await verifyAccessToken(wrongAudience)).toBeNull();
  });

  it("rejects a token with no subject", async () => {
    const noSub = await new SignJWT({ onboardingComplete: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("meydan")
      .setAudience("meydan-mobile")
      .setExpirationTime("15m")
      .sign(secret());

    expect(await verifyAccessToken(noSub)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();
    expect(await verifyAccessToken("")).toBeNull();
  });
});

describe("refresh tokens", () => {
  it("generates unique high-entropy tokens", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateRefreshToken));
    expect(tokens.size).toBe(200);
    // 32 random bytes in base64url — 43 chars, no padding.
    expect(generateRefreshToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashes deterministically and irreversibly", () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toMatch(/^[a-f0-9]{64}$/);
    // The stored value must not contain the presented token.
    expect(hashRefreshToken(token)).not.toContain(token);
  });

  it("hashes different tokens differently", () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(
      hashRefreshToken(generateRefreshToken()),
    );
  });

  it("computes expiry the configured number of days out", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(refreshTokenExpiry(from).toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(REFRESH_TOKEN_TTL_DAYS).toBe(60);
  });
});
