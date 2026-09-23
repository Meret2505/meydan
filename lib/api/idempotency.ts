import { Prisma } from "@prisma/client";
import { badRequest, conflict } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

/**
 * Makes a create endpoint safe to ask twice.
 *
 * The failure this exists for is not a double tap — the clients already disable
 * their submit button. It is the response that never arrives: the game is
 * created, the connection drops on the way back, and the client retries or the
 * person taps again on a screen that still looks unsent. Nothing downstream can
 * tell that second request from a genuine one, so the only place to catch it is
 * here, on a key the client repeats.
 *
 * Callers wrap the part that *produces the payload*, not the Response:
 *
 *     const detail = await withIdempotency(request, userId, "create-game",
 *       async () => { ...create...; return toGameDetailDto(game, origin); });
 *     return ok(detail);
 *
 * so the replay is the same JSON the first attempt returned.
 *
 * A request with no `Idempotency-Key` runs unguarded. That is deliberate: the
 * header cannot be made mandatory without breaking every copy of the app
 * already installed, and a missing key leaves the endpoint exactly as safe as
 * it was before this file existed.
 */

/** Long enough for a UUID, bounded so the header cannot be used as storage. */
const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 200;

/** Printable ASCII without whitespace — a UUID, a ULID, or a hash. */
const KEY_PATTERN = /^[\x21-\x7e]+$/;

export const IDEMPOTENCY_HEADER = "idempotency-key";

export async function withIdempotency<T>(
  request: Request,
  userId: string,
  endpoint: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = request.headers.get(IDEMPOTENCY_HEADER);
  if (key === null) return run();

  if (
    key.length < MIN_KEY_LENGTH ||
    key.length > MAX_KEY_LENGTH ||
    !KEY_PATTERN.test(key)
  ) {
    throw badRequest("invalid_idempotency_key");
  }

  const claimed = await claim(userId, key, endpoint);
  if (!claimed.ok) return claimed.replay as T;

  try {
    const result = await run();
    await prisma.idempotencyKey.update({
      where: { userId_key: { userId, key } },
      // `?? null` because Prisma reads `undefined` as "leave this field alone",
      // which would leave the claim unresolved and every later retry stuck on
      // request_in_progress. A handler returning nothing is a legitimate
      // success to replay.
      data: { response: (result ?? null) as Prisma.InputJsonValue },
    });
    return result;
  } catch (error) {
    // Release the claim: the caller's next attempt is a *new* try at work that
    // never happened, and it must not be answered with this failure. Swallow a
    // delete that itself fails — the original error is the one worth reporting,
    // and the row expires either way (see purgeExpiredRows).
    await prisma.idempotencyKey
      .delete({ where: { userId_key: { userId, key } } })
      .catch(() => undefined);
    throw error;
  }
}

type Claim = { ok: true } | { ok: false; replay: unknown };

/**
 * Takes the key, or reports what the existing holder means.
 *
 * The claim is an insert, so two requests racing on one key are separated by
 * the unique index — the loser is told apart from the winner by the database,
 * not by a read-then-write that both would win.
 */
async function claim(userId: string, key: string, endpoint: string): Promise<Claim> {
  try {
    await prisma.idempotencyKey.create({ data: { userId, key, endpoint } });
    return { ok: true };
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
    select: { endpoint: true, response: true },
  });

  // Gone between the failed insert and this read: the holder failed and
  // released it. Retrying the claim would be a loop, and the honest answer is
  // the same one the in-flight case gets — ask again.
  if (!existing) throw conflict("request_in_progress");

  if (existing.endpoint !== endpoint) throw conflict("idempotency_key_reused");
  if (existing.response === null) throw conflict("request_in_progress");

  return { ok: false, replay: existing.response };
}
