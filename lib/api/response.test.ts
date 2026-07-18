import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { badRequest, conflict, ApiError } from "./errors";
import { handler, ok } from "./response";
import { parseJson, parseQuery } from "./validate";

describe("ok", () => {
  it("wraps data in the success envelope", async () => {
    const response = ok({ id: "g1" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { id: "g1" } });
  });

  it("includes meta when supplied", async () => {
    const response = ok([1, 2], { total: 2, page: 1, limit: 50 });
    expect(await response.json()).toEqual({
      success: true,
      data: [1, 2],
      meta: { total: 2, page: 1, limit: 50 },
    });
  });
});

describe("handler", () => {
  it("passes successful responses through", async () => {
    const wrapped = handler(async () => ok({ fine: true }));
    expect((await wrapped()).status).toBe(200);
  });

  it("converts a thrown ApiError into its status and code", async () => {
    const wrapped = handler(async () => {
      throw conflict("game_full");
    });
    const response = await wrapped();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, error: "game_full" });
  });

  it("converts an unexpected error into an opaque 500", async () => {
    // Internal detail must never reach the client: Prisma messages and stack
    // traces disclose schema and file layout.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = handler(async () => {
      throw new Error("Invalid `prisma.user.findUnique()` invocation: secret detail");
    });
    const response = await wrapped();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "internal" });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("forwards handler arguments", async () => {
    const wrapped = handler(async (a: number, b: number) => ok(a + b));
    expect(await (await wrapped(2, 3)).json()).toEqual({ success: true, data: 5 });
  });
});

describe("errors", () => {
  it("maps helpers to the right status codes", () => {
    expect(badRequest().status).toBe(400);
    expect(conflict("phone_taken").status).toBe(409);
    expect(conflict("phone_taken").code).toBe("phone_taken");
    expect(new ApiError("custom", 418).status).toBe(418);
  });
});

describe("parseJson", () => {
  const schema = z.object({ phone: z.string().min(1), password: z.string().min(1) });

  it("returns parsed data on a valid body", async () => {
    const request = new Request("https://example.com/x", {
      method: "POST",
      body: JSON.stringify({ phone: "+99312345678", password: "hunter22" }),
    });
    await expect(parseJson(request, schema)).resolves.toEqual({
      phone: "+99312345678",
      password: "hunter22",
    });
  });

  it("rejects malformed JSON with invalid_input", async () => {
    const request = new Request("https://example.com/x", {
      method: "POST",
      body: "{not json",
    });
    await expect(parseJson(request, schema)).rejects.toMatchObject({
      code: "invalid_input",
      status: 400,
    });
  });

  it("rejects a schema mismatch", async () => {
    const request = new Request("https://example.com/x", {
      method: "POST",
      body: JSON.stringify({ phone: "" }),
    });
    await expect(parseJson(request, schema)).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});

describe("parseQuery", () => {
  const schema = z.object({ tab: z.enum(["open", "mine"]).default("open") });

  it("parses and defaults search params", () => {
    expect(parseQuery(new Request("https://x.com/g?tab=mine"), schema)).toEqual({
      tab: "mine",
    });
    expect(parseQuery(new Request("https://x.com/g"), schema)).toEqual({ tab: "open" });
  });

  it("rejects an out-of-range value", () => {
    expect(() => parseQuery(new Request("https://x.com/g?tab=bogus"), schema)).toThrow(
      ApiError,
    );
  });
});
