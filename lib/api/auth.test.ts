import { describe, expect, it } from "vitest";
import { requireAuth, requireOnboarded } from "./auth";
import { ApiError } from "./errors";
import { signAccessToken } from "./tokens";

async function requestWith(header?: string): Promise<Request> {
  return new Request("https://example.com/api/v1/me", {
    headers: header ? { authorization: header } : {},
  });
}

async function expectStatus(fn: () => Promise<unknown>, status: number, code: string) {
  await expect(fn()).rejects.toThrow(ApiError);
  await fn().catch((error: ApiError) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });
}

describe("requireAuth", () => {
  it("accepts a valid bearer token", async () => {
    const token = await signAccessToken({ userId: "u1", onboardingComplete: true });
    const claims = await requireAuth(await requestWith(`Bearer ${token}`));
    expect(claims.userId).toBe("u1");
  });

  it("accepts a lowercase scheme (RFC 7235 says it is case-insensitive)", async () => {
    const token = await signAccessToken({ userId: "u1", onboardingComplete: true });
    const claims = await requireAuth(await requestWith(`bearer ${token}`));
    expect(claims.userId).toBe("u1");
  });

  it("rejects a missing header", async () => {
    await expectStatus(async () => requireAuth(await requestWith()), 401, "unauthorized");
  });

  it("rejects a non-bearer scheme", async () => {
    await expectStatus(
      async () => requireAuth(await requestWith("Basic dXNlcjpwYXNz")),
      401,
      "unauthorized",
    );
  });

  it("rejects an empty bearer value", async () => {
    await expectStatus(
      async () => requireAuth(await requestWith("Bearer ")),
      401,
      "unauthorized",
    );
  });

  it("rejects a forged token", async () => {
    await expectStatus(
      async () => requireAuth(await requestWith("Bearer not.a.jwt")),
      401,
      "unauthorized",
    );
  });
});

describe("requireOnboarded", () => {
  it("passes a fully onboarded user through", async () => {
    const token = await signAccessToken({ userId: "u1", onboardingComplete: true });
    const claims = await requireOnboarded(await requestWith(`Bearer ${token}`));
    expect(claims.userId).toBe("u1");
  });

  it("rejects an authenticated but un-onboarded user with 403", async () => {
    // Mirrors the web guard: authenticated, but must finish onboarding first.
    // 403 (not 401) matters — the client should route to onboarding, not to
    // login, and must not discard a perfectly valid token.
    const token = await signAccessToken({ userId: "u1", onboardingComplete: false });
    await expectStatus(
      async () => requireOnboarded(await requestWith(`Bearer ${token}`)),
      403,
      "onboarding_required",
    );
  });
});
