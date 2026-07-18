import type { TypeOf, ZodTypeAny } from "zod";
import { badRequest } from "./errors";

/**
 * Parses and validates a JSON request body.
 *
 * Throws `invalid_input` on malformed JSON or a schema mismatch. Zod's issue
 * list is deliberately not returned to the client: it names internal field
 * paths, and no client here needs field-level errors — the Android forms
 * validate locally before submitting.
 */
export async function parseJson<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<TypeOf<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("invalid_input", "Request body is not valid JSON");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest("invalid_input", result.error.issues[0]?.message);
  }
  return result.data;
}

/** Parses and validates URL search params against a schema. */
export function parseQuery<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): TypeOf<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    throw badRequest("invalid_input", result.error.issues[0]?.message);
  }
  return result.data;
}
