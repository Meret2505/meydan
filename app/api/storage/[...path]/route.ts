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
// can't be turned into an open proxy for arbitrary Supabase paths.
const ALLOWED_BUCKETS = new Set(["avatars", "field-photos"]);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  if (!SUPABASE_URL) return new Response("storage misconfigured", { status: 500 });

  const [bucket, ...rest] = params.path;
  if (!bucket || rest.length === 0 || !ALLOWED_BUCKETS.has(bucket)) {
    return new Response("not found", { status: 404 });
  }

  const objectPath = rest.map(encodeURIComponent).join("/");
  const upstreamUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;

  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("not found", { status: upstream.status || 502 });
  }

  const headers = new Headers();
  const passthrough = ["content-type", "content-length", "etag", "last-modified"];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // 1h edge cache + 30d SWR — small pool of public assets that rarely change.
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=2592000");

  return new Response(upstream.body, { status: 200, headers });
}
