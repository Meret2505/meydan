import { describe, expect, it } from "vitest";
import { cacheControlFor } from "./storage-cache";

/**
 * Uploaded objects are named `<owner>/<timestamp>-<uuid>.<ext>` (see
 * lib/services/uploads.ts), so their bytes can never change — the URL changes
 * instead. Those are safe to freeze on the device for a year, which is what
 * stops Coil re-downloading every pitch photo on a metered Turkmen connection.
 *
 * Seeded and third-party objects live at stable paths that a re-import could
 * overwrite, so they get a long-but-revalidating window instead.
 */
describe("cacheControlFor", () => {
  const immutable = "public, max-age=31536000, immutable";

  it("freezes an uploaded field photo", () => {
    expect(
      cacheControlFor("field-photos", "cmu2feh3m0001ry70/1789457760664-38f9a402-de21-4f58-b57d-8c101a543c33.jpg"),
    ).toBe(immutable);
  });

  it("freezes an uploaded avatar", () => {
    expect(
      cacheControlFor("avatars", "cmqlbhesv0000n0in/1789457760664-38f9a402-de21-4f58-b57d-8c101a543c33.png"),
    ).toBe(immutable);
  });

  it("lets a seeded pitch photo revalidate — a re-import reuses its path", () => {
    const value = cacheControlFor("field-photos", "refresh/cmqlp5a56000eflvrqgt7epqn.jpg");
    expect(value).not.toContain("immutable");
    expect(value).toContain("stale-while-revalidate");
  });

  it("lets a third-party object revalidate", () => {
    expect(cacheControlFor("yakyn", "images/pitch-12.jpg")).not.toContain("immutable");
  });

  it("does not freeze a path that merely contains a dash", () => {
    expect(cacheControlFor("field-photos", "some-folder/not-a-uuid.jpg")).not.toContain("immutable");
  });

  it("caches every object for at least a day", () => {
    for (const [bucket, path] of [
      ["field-photos", "refresh/x.jpg"],
      ["avatars", "legacy.png"],
      ["yakyn", "a/b.jpg"],
    ] as const) {
      const maxAge = Number(/max-age=(\d+)/.exec(cacheControlFor(bucket, path))?.[1]);
      expect(maxAge).toBeGreaterThanOrEqual(86400);
    }
  });
});
