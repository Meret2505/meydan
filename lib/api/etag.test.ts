import { describe, expect, it } from "vitest";
import { etagFor, okRevalidatable } from "./response";

/**
 * The catalogue endpoints answer the same bytes for days at a time. An ETag
 * turns that into a bodiless 304 — on these connections the body is the
 * expensive part, not the round trip.
 */
describe("etagFor", () => {
  it("is stable for the same payload", () => {
    expect(etagFor('{"a":1}')).toBe(etagFor('{"a":1}'));
  });

  it("changes when anything in the payload changes", () => {
    expect(etagFor('{"a":1}')).not.toBe(etagFor('{"a":2}'));
  });

  it("is a weak validator, since the body is generated per request", () => {
    expect(etagFor("{}").startsWith('W/"')).toBe(true);
  });

  it("is header-safe", () => {
    // base64url, so no quotes or commas to break the header.
    expect(etagFor("любое тело с кириллицей")).toMatch(/^W\/"[A-Za-z0-9_-]+"$/);
  });
});

describe("okRevalidatable", () => {
  const request = (etag?: string) =>
    new Request("https://meydan.test/api/v1/fields", {
      headers: etag ? { "if-none-match": etag } : {},
    });

  it("sends the body and an ETag when the client has nothing", async () => {
    const response = okRevalidatable(request(), { fields: [1, 2, 3] });
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBeTruthy();
    expect(await response.json()).toEqual({ success: true, data: { fields: [1, 2, 3] } });
  });

  it("answers 304 with no body when the client already has this payload", async () => {
    const first = okRevalidatable(request(), { fields: [1, 2, 3] });
    const etag = first.headers.get("etag")!;

    const second = okRevalidatable(request(etag), { fields: [1, 2, 3] });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
    expect(second.headers.get("etag")).toBe(etag);
  });

  it("sends the body again once the payload changes", () => {
    const stale = okRevalidatable(request(), { fields: [1] }).headers.get("etag")!;
    expect(okRevalidatable(request(stale), { fields: [1, 2] }).status).toBe(200);
  });

  it("always revalidates rather than letting a client go stale", () => {
    expect(okRevalidatable(request(), {}).headers.get("cache-control")).toBe("private, no-cache");
  });
});
