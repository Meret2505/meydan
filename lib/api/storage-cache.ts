/**
 * How long a proxied storage object may be cached, decided per object rather
 * than with one blanket value.
 *
 * The proxy used to send `max-age=3600` for everything. Vercel's edge consumed
 * the `s-maxage` and the phone was left with a one-hour window, so Coil
 * re-downloaded every pitch photo hourly — on the metered, slow connections
 * this app is built for, and for bytes that had not changed.
 *
 * Uploads are written as `<owner>/<timestamp>-<uuid>.<ext>` (lib/services/
 * uploads.ts) and never overwritten: replacing an avatar writes a new path and
 * deletes the old object. Those URLs are genuinely immutable, so the device can
 * keep them for a year. Seeded pitch photos (`refresh/<id>.jpg`) and the
 * third-party `yakyn` objects sit at stable paths a re-import could overwrite,
 * so they get a long window that still revalidates.
 */

/** `<timestamp>-<uuid>.<ext>`, as uploads.ts writes it. */
const UPLOADED_OBJECT = /\/\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z]+$/i;

const IMMUTABLE = "public, max-age=31536000, immutable";

// 30 days on the device, and a year of stale-while-revalidate so the edge can
// serve instantly while it refreshes in the background.
const REVALIDATING = "public, max-age=2592000, stale-while-revalidate=31536000";

export function cacheControlFor(bucket: string, objectPath: string): string {
  const isUpload =
    (bucket === "avatars" || bucket === "field-photos") &&
    UPLOADED_OBJECT.test(`/${objectPath}`);
  return isUpload ? IMMUTABLE : REVALIDATING;
}
