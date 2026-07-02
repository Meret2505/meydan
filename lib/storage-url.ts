// Rewrites Supabase-Storage public URLs to our /api/storage proxy so the
// client browser never talks to *.supabase.co (blocked in Turkmenistan).
//
// Idempotent: URLs that don't match Supabase's public-object shape pass
// through unchanged. That means old rows in the DB (full Supabase URLs) and
// any future backend (e.g. local /uploads) both work.

const PUBLIC_MARKER = "/storage/v1/object/public/";

export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(PUBLIC_MARKER);
  if (i === -1) return url;
  return `/api/storage/${url.slice(i + PUBLIC_MARKER.length)}`;
}
