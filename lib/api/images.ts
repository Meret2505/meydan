import { toProxyUrl } from "@/lib/storage-url";

/**
 * Resolves the public origin this request arrived on.
 *
 * `request.url` alone is not enough behind a reverse proxy: nginx forwards to
 * the app over plain http on an internal host (see nginx/conf.d and
 * docker-compose.prod.yml), so the raw URL would yield "http://app:3000". The
 * x-forwarded-* headers carry what the client actually asked for.
 */
export function originOf(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

/**
 * Normalises a stored image URL into an absolute URL a native client can load
 * directly.
 *
 * Two things happen here, and both matter:
 *
 * 1. `toProxyUrl` rewrites Supabase and yakyn.biz URLs onto our own
 *    /api/storage proxy. Skipping this would point Android straight at
 *    **.supabase.co, which is blocked in Turkmenistan (see DEPLOY-VPS.md) —
 *    images would simply never load for real users.
 * 2. The result is made absolute. toProxyUrl returns a *relative* path, which
 *    is fine for an <img> on the same origin but useless to Coil. Meanwhile
 *    pass-through URLs (Google avatars on lh3.googleusercontent.com) are
 *    already absolute, so without this step the same field would sometimes be
 *    relative and sometimes absolute — a trap for every client that consumes it.
 */
export function absoluteImageUrl(
  url: string | null | undefined,
  origin: string,
): string | null {
  const proxied = toProxyUrl(url);
  if (!proxied) return null;
  return proxied.startsWith("/") ? `${origin}${proxied}` : proxied;
}
