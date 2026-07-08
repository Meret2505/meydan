const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Serve a precached offline page when the document fetch fails. The
  // /[locale]/offline route is rendered at build time and the SW falls back
  // to /ru/offline if the user has no network.
  fallbacks: {
    document: "/ru/offline",
  },
  // Don't serve cached HTML to clients that may be on a stale build during
  // the brief deploy window. The default exclusions plus the app manifest
  // are enough; the broader runtime caching below handles fresh visits.
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  runtimeCaching: [
    // --- Static asset families: aggressive cache ---
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "fonts",
        expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources",
        expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // --- OpenStreetMap tiles (used by Leaflet on /fields/[id]) ---
    {
      urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "osm-tiles",
        expiration: { maxEntries: 512, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // --- API / auth: never serve stale on the happy path, but tolerate the
    // network being briefly unreachable ---
    {
      urlPattern: /\/api\/(?!auth\/).*/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "api",
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 5 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // --- Document navigations: always try network first, fall back to cache,
    // then to the offline page (configured above) ---
    {
      urlPattern: ({ request, url }) =>
        request.mode === "navigate" && !url.pathname.startsWith("/api/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 6,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const withNextIntl = require("next-intl/plugin")("./i18n.ts");

// Content-Security-Policy. Scripts/styles need 'unsafe-inline' because Next's
// App Router injects inline bootstrap scripts and we don't run a nonce
// middleware; everything else is locked to same-origin plus the few external
// hosts the app actually talks to (OSM tiles for Leaflet, Google avatar CDN,
// Google Fonts). Tighten script-src to a nonce later if we add nonce plumbing.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.tile.openstreetmap.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Client Router Cache retention. Once a tab/page has been rendered, revisiting
    // it within this window restores the FULLY-rendered screen from memory — no
    // server request and no loading skeleton. The window is set long (30 min) so a
    // route only ever shows its skeleton on the FIRST visit of a session; every
    // switch back to an already-seen tab is instant.
    //
    // Trade-off: cached screens can be up to `dynamic` seconds stale. Data still
    // refreshes on (a) the first visit, (b) any Server Action that calls
    // revalidatePath, (c) router.refresh(), and (d) an app restart / full reload.
    // If a live tab must never go stale, pair a shorter value with a
    // refresh-on-foreground call (see below) instead of lowering this.
    staleTimes: {
      dynamic: 1800,
      static: 3600,
    },
  },
  // Restrict the image optimizer to the hosts we actually load from. A wildcard
  // (`hostname: "**"`) turns the optimizer into an open image proxy and is the
  // exact configuration flagged by GHSA-9g9p-9gw9-jx7f (DoS via remotePatterns).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "meydan-chi.vercel.app" },
      { protocol: "https", hostname: "yakyn.biz" },
    ],
  },
  // Standalone output bundles only what the server needs into .next/standalone,
  // so the Docker image is tiny. Harmless on Vercel (it ignores this and uses
  // its own packaging), required for `node server.js` in the prod container.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = withNextIntl(withPWA(nextConfig));
