import { createHash } from "crypto";
import { ApiError } from "./errors";

/**
 * Response envelope for /api/v1. Matches the ApiResponse<T> shape already used
 * as the project's convention, so web and mobile speak the same dialect.
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
};

export function ok<T>(data: T, meta?: ApiResponse<T>["meta"]): Response {
  const body: ApiResponse<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  return Response.json(body);
}

/**
 * [ok], but revalidatable: the body is hashed into an ETag, and a client that
 * already has that exact payload gets a bodiless 304.
 *
 * The read endpoints had no caching of any kind, so the pitch catalogue — which
 * changes maybe weekly — was re-downloaded in full on every app start, on a
 * connection where that is the expensive part. `no-cache` rather than a max-age
 * because the answer must still be *correct*: the client always asks, and the
 * saving is the body, not the round trip.
 *
 * Only for GETs whose payload is a pure function of the request.
 */
export function okRevalidatable<T>(request: Request, data: T): Response {
  const body = JSON.stringify({ success: true, data } satisfies ApiResponse<T>);
  const etag = etagFor(body);

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, no-cache" },
    });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "private, no-cache",
    },
  });
}

/**
 * Weak validator over the serialized body. Weak because it says "semantically
 * the same payload", which is exactly the question a client is asking, and
 * because the body is generated per request rather than served from a file.
 */
export function etagFor(body: string): string {
  return `W/"${createHash("sha1").update(body).digest("base64url")}"`;
}

export function fail(error: ApiError): Response {
  const body: ApiResponse<never> = { success: false, error: error.code };
  return Response.json(body, { status: error.status });
}

/**
 * Wraps a route handler so thrown ApiErrors become well-formed responses and
 * anything unexpected becomes a 500 without leaking internals to the client.
 *
 * Unknown errors are logged server-side but never echoed back: stack traces and
 * Prisma messages can disclose schema details, so the client only ever sees
 * "internal".
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) return fail(error);
      console.error("Unhandled API error:", error);
      return Response.json(
        { success: false, error: "internal" } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  };
}
