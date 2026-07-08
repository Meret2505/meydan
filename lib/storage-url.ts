// Rewrites external image URLs to our /api/storage proxy so the client
// browser never talks to blocked/unreachable hosts directly.
// - Supabase Storage public URLs → /api/storage/<bucket>/<path>
// - yakyn.biz photo URLs (seeded from the Turkmen business directory) →
//   /api/storage/yakyn/<path>. The WebView blocks these otherwise (mixed
//   content + Capacitor allow-list), so proxying them through our own
//   HTTPS origin is what lets them render.
//
// Idempotent: URLs that don't match either shape pass through unchanged.

const SUPABASE_MARKER = "/storage/v1/object/public/";
const YAKYN_MARKER = "yakyn.biz";

export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const supa = url.indexOf(SUPABASE_MARKER);
  if (supa !== -1) return `/api/storage/${url.slice(supa + SUPABASE_MARKER.length)}`;
  if (url.includes(YAKYN_MARKER)) {
    const path = url.replace(/^https?:\/\/[^/]+\//, "");
    return `/api/storage/yakyn/${path}`;
  }
  return url;
}
