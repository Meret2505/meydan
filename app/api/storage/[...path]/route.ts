// Proxies Supabase Storage objects through our Vercel origin so client browsers
// never talk to *.supabase.co directly (Supabase is blocked in Turkmenistan).
//
// Path format:
//   /api/storage/<bucket>/<object-path>
//
// Example: /api/storage/avatars/user-abc.png → fetched from
//   ${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/user-abc.png
//
// Response is streamed back with the upstream Cache-Control so Vercel's edge
// cache serves repeat requests without hitting Supabase again.

import { NextRequest } from "next/server";

// Only allow the buckets we actually use — refuse anything else so this route
// can't be turned into an open proxy for arbitrary paths.
const SUPABASE_BUCKETS = new Set(["avatars", "field-photos"]);
const YAKYN_ORIGIN = "https://yakyn.biz:8000";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

// Only ever hand back image content-types. The `yakyn` upstream is a third
// party we don't control, and responses are served from *our* origin and
// edge-cached for up to 30 days — so an upstream returning text/html or
// image/svg+xml would otherwise become stored XSS same-origin.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const FETCH_TIMEOUT_MS = 8000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const [bucket, ...rest] = params.path;
  if (!bucket || rest.length === 0) {
    return new Response("not found", { status: 404 });
  }

  let upstreamUrl: string;
  if (bucket === "yakyn") {
    // Seeded field photos scraped from the Turkmen business directory. The
    // WebView blocks these otherwise (mixed-content + Capacitor allow-list),
    // so we proxy them through our own HTTPS origin.
    upstreamUrl = `${YAKYN_ORIGIN}/${rest.map(encodeURIComponent).join("/")}`;
  } else if (SUPABASE_BUCKETS.has(bucket)) {
    if (!SUPABASE_URL) return new Response("storage misconfigured", { status: 500 });
    const objectPath = rest.map(encodeURIComponent).join("/");
    upstreamUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
  } else {
    return new Response("not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    // Timeout or network error — don't hold the handler open on a slow upstream.
    return new Response("upstream timeout", { status: 504 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("not found", { status: upstream.status || 502 });
  }

  // Refuse to serve anything that isn't an allow-listed image type. This keeps
  // an untrusted upstream from turning our origin into an XSS/HTML host.
  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return new Response("unsupported media type", { status: 415 });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  for (const h of ["content-length", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // 1h edge cache + 30d SWR — small pool of public assets that rarely change.
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=2592000");

  return new Response(upstream.body, { status: 200, headers });
}
