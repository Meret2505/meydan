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
