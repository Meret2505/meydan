import { describe, expect, it } from "vitest";
import { normalizeResultInput } from "./game-result";

/**
 * The result is optional by design: a game that was played but never written
 * up is a normal outcome, and attendance — not the score — is what feeds the
 * reliability rating. So "no score at all" has to be a valid submission, while
 * half a score is not a result at all.
 */
describe("normalizeResultInput", () => {
  it("accepts attendance with no score", () => {
    expect(normalizeResultInput({ attended: { a: true, b: false } })).toEqual({
      scoreHome: null,
      scoreAway: null,
      attended: { a: true, b: false },
    });
  });

  it("accepts a full score", () => {
    expect(normalizeResultInput({ scoreHome: 3, scoreAway: 2 })).toEqual({
      scoreHome: 3,
      scoreAway: 2,
      attended: {},
    });
  });

  it("accepts a nil-nil draw, which is a real result", () => {
    expect(normalizeResultInput({ scoreHome: 0, scoreAway: 0 })).toMatchObject({
      scoreHome: 0,
      scoreAway: 0,
    });
  });

  it("rejects half a score", () => {
    expect(normalizeResultInput({ scoreHome: 3 })).toBeNull();
    expect(normalizeResultInput({ scoreAway: 1 })).toBeNull();
    expect(normalizeResultInput({ scoreHome: 2, scoreAway: null })).toBeNull();
  });

  it("rejects a score that is not a whole, sane number", () => {
    expect(normalizeResultInput({ scoreHome: -1, scoreAway: 0 })).toBeNull();
    expect(normalizeResultInput({ scoreHome: 1.5, scoreAway: 0 })).toBeNull();
    expect(normalizeResultInput({ scoreHome: 200, scoreAway: 0 })).toBeNull();
    expect(normalizeResultInput({ scoreHome: Number.NaN, scoreAway: 0 })).toBeNull();
  });

  it("treats an empty submission as nothing to record", () => {
    expect(normalizeResultInput({})).toBeNull();
  });
});
