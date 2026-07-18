/**
 * Client IP for rate-limit keys, read from the Request.
 *
 * lib/rate-limit.ts exposes clientIp(), which reads next/headers — necessary in
 * a Server Action, where there is no request object in scope. A Route Handler
 * is handed the Request directly, so it can read the same headers without
 * depending on Next's async-local storage. That also makes handlers callable
 * from tests as plain functions.
 *
 * Semantics deliberately match clientIp(): first hop of X-Forwarded-For, then
 * X-Real-IP, then a constant so a missing header degrades to a shared
 * (stricter) bucket rather than no limit at all.
 */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
