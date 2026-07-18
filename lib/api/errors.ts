/**
 * Error taxonomy for the /api/v1 surface.
 *
 * The existing Server Actions communicate failure by silently `return`-ing
 * (see app/actions/*.ts), which is workable when a form is the only caller but
 * useless to a native client — it cannot tell "you are not allowed" from "the
 * game filled up" from "the request never ran". Every one of those silent
 * paths maps to an explicit ApiError here.
 *
 * `code` is the machine-readable string a client branches on. Where the web
 * actions already return a code (e.g. "wrong_password", "rate_limited"), the
 * same string is reused so the two surfaces stay legible together.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** 400 — malformed or semantically invalid input. */
export const badRequest = (code = "invalid_input", message?: string) =>
  new ApiError(code, 400, message);

/** 401 — no credentials, or credentials that did not verify. */
export const unauthorized = (code = "unauthorized", message?: string) =>
  new ApiError(code, 401, message);

/** 403 — authenticated, but not permitted to do this. */
export const forbidden = (code = "forbidden", message?: string) =>
  new ApiError(code, 403, message);

/** 404 — no such resource, or one the caller may not know exists. */
export const notFound = (code = "not_found", message?: string) =>
  new ApiError(code, 404, message);

/**
 * 409 — the request was valid but conflicts with current state.
 * Carries the specific reason: "game_full", "phone_taken", "already_joined".
 */
export const conflict = (code: string, message?: string) =>
  new ApiError(code, 409, message);

/** 429 — throttled by lib/rate-limit.ts. */
export const rateLimited = (code = "rate_limited", message?: string) =>
  new ApiError(code, 429, message);
