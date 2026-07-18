import { describe, expect, it } from "vitest";
import { absoluteImageUrl, originOf } from "./images";

const ORIGIN = "https://meydan-chi.vercel.app";

describe("absoluteImageUrl", () => {
  it("proxies Supabase URLs and makes them absolute", () => {
    // The whole point: Android must never be handed a **.supabase.co URL,
    // because that host is blocked in Turkmenistan.
    const stored =
      "https://abc.supabase.co/storage/v1/object/public/avatars/u1/photo.jpg";
    const result = absoluteImageUrl(stored, ORIGIN);

    expect(result).toBe(`${ORIGIN}/api/storage/avatars/u1/photo.jpg`);
    expect(result).not.toContain("supabase.co");
  });

  it("proxies yakyn.biz field photos", () => {
    const stored = "https://yakyn.biz:8000/media/fields/pitch.jpg";
    expect(absoluteImageUrl(stored, ORIGIN)).toBe(
      `${ORIGIN}/api/storage/yakyn/media/fields/pitch.jpg`,
    );
  });

  it("leaves already-absolute foreign URLs absolute", () => {
    // Google avatars pass through toProxyUrl untouched. They must still come
    // back absolute so the field is never a mix of relative and absolute.
    const google = "https://lh3.googleusercontent.com/a/ABC123";
    expect(absoluteImageUrl(google, ORIGIN)).toBe(google);
  });

  it("always returns an absolute URL or null, never a relative path", () => {
    const inputs = [
      "https://abc.supabase.co/storage/v1/object/public/avatars/a.jpg",
      "https://yakyn.biz:8000/x.jpg",
      "https://lh3.googleusercontent.com/a/ABC",
    ];
    for (const input of inputs) {
      const result = absoluteImageUrl(input, ORIGIN);
      expect(result?.startsWith("http")).toBe(true);
    }
  });

  it("maps absent values to null", () => {
    expect(absoluteImageUrl(null, ORIGIN)).toBeNull();
    expect(absoluteImageUrl(undefined, ORIGIN)).toBeNull();
    expect(absoluteImageUrl("", ORIGIN)).toBeNull();
  });
});

describe("originOf", () => {
  it("uses the request URL when unproxied", () => {
    expect(originOf(new Request("https://example.com/api/v1/games?x=1"))).toBe(
      "https://example.com",
    );
  });

  it("prefers x-forwarded-* headers behind a reverse proxy", () => {
    // nginx forwards to the app over plain http on an internal hostname, so
    // the raw request URL would produce "http://app:3000" — useless to a phone.
    const request = new Request("http://app:3000/api/v1/games", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "meydan.example.com",
      },
    });
    expect(originOf(request)).toBe("https://meydan.example.com");
  });

  it("falls back to the Host header when only proto is forwarded", () => {
    const request = new Request("http://app:3000/api/v1/games", {
      headers: { "x-forwarded-proto": "https", host: "meydan.example.com" },
    });
    expect(originOf(request)).toBe("https://meydan.example.com");
  });
});
