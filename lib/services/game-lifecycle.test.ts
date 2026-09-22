import { describe, expect, it } from "vitest";
import { PLAYED_AFTER_MS, playedCutoff } from "./game-lifecycle";

/**
 * The cutoff decides when a game stops being "about to happen" and becomes
 * history. Getting it wrong in either direction is visible to users: too eager
 * and a game closes while people are still playing, too lazy and it lingers as
 * joinable long after the final whistle.
 */
describe("playedCutoff", () => {
  const kickoff = new Date("2026-09-21T21:00:00.000Z");

  it("does not close a game that has just kicked off", () => {
    const now = new Date(kickoff.getTime() + 60 * 60 * 1000); // an hour in
    expect(playedCutoff(now) < kickoff).toBe(true);
  });

  it("does not close a game still inside the grace window", () => {
    const now = new Date(kickoff.getTime() + PLAYED_AFTER_MS - 1);
    expect(playedCutoff(now) < kickoff).toBe(true);
  });

  it("closes a game once the grace window has passed", () => {
    const now = new Date(kickoff.getTime() + PLAYED_AFTER_MS);
    expect(playedCutoff(now) <= kickoff).toBe(true);
    expect(playedCutoff(now).getTime()).toBe(kickoff.getTime());
  });

  it("closes yesterday's evening game by the next morning", () => {
    // The case that prompted this: 21:00 game, looked at the next day.
    const nextMorning = new Date("2026-09-22T08:00:00.000Z");
    expect(playedCutoff(nextMorning) > kickoff).toBe(true);
  });

  it("keeps the grace window under a working day", () => {
    // A sanity bound: whatever this is tuned to, a game must not stay open
    // overnight, because the feed has already stopped showing it.
    expect(PLAYED_AFTER_MS).toBeLessThan(8 * 60 * 60 * 1000);
    expect(PLAYED_AFTER_MS).toBeGreaterThanOrEqual(60 * 60 * 1000);
  });
});
