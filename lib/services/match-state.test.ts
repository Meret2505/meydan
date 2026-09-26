import { describe, expect, it } from "vitest";
import {
  confirmCutoff,
  isScoreCounted,
  matchStateOf,
  SCORE_CONFIRM_WINDOW_MS,
  type MatchRow,
} from "@/lib/services/match-state";

/**
 * The state is derived, not stored, so this is where the rules actually live.
 * Every row below is a shape the database can hold; the point of the tests is
 * that no two of them read as the same state.
 */
describe("match state", () => {
  const base: MatchRow = {
    status: "OPEN",
    awayTeamId: null,
    agreedAt: null,
    declinedAt: null,
    scoreReportedAt: null,
    scoreConfirmedAt: null,
  };

  const at = (iso: string) => new Date(iso);

  it("is an open call with no opponent named", () => {
    expect(matchStateOf(base)).toBe("open_call");
  });

  it("is pending once a team is challenged", () => {
    expect(matchStateOf({ ...base, awayTeamId: "t2" })).toBe("pending");
  });

  it("is agreed once the challenged captain accepts", () => {
    expect(
      matchStateOf({
        ...base,
        status: "FULL",
        awayTeamId: "t2",
        agreedAt: at("2026-09-27T10:00:00Z"),
      }),
    ).toBe("agreed");
  });

  it("tells a decline apart from a cancellation", () => {
    // Both end up CANCELLED. Only the timestamp says which happened, and an
    // agreed match called off by the home captain must not read as "they
    // said no".
    const declined = matchStateOf({
      ...base,
      status: "CANCELLED",
      awayTeamId: "t2",
      declinedAt: at("2026-09-27T10:00:00Z"),
    });
    const cancelled = matchStateOf({
      ...base,
      status: "CANCELLED",
      awayTeamId: "t2",
      agreedAt: at("2026-09-27T09:00:00Z"),
    });

    expect(declined).toBe("declined");
    expect(cancelled).toBe("cancelled");
  });

  it("is played once kickoff passed with no score", () => {
    expect(
      matchStateOf({
        ...base,
        status: "COMPLETED",
        awayTeamId: "t2",
        agreedAt: at("2026-09-27T10:00:00Z"),
      }),
    ).toBe("played");
  });

  it("moves through reported to confirmed", () => {
    const played: MatchRow = {
      ...base,
      status: "COMPLETED",
      awayTeamId: "t2",
      agreedAt: at("2026-09-27T10:00:00Z"),
    };
    const reported = { ...played, scoreReportedAt: at("2026-09-27T22:00:00Z") };
    const confirmed = { ...reported, scoreConfirmedAt: at("2026-09-28T08:00:00Z") };

    expect(matchStateOf(reported)).toBe("score_reported");
    expect(matchStateOf(confirmed)).toBe("score_confirmed");
  });

  it("reads a cancelled open call as cancelled, not as an open call", () => {
    expect(matchStateOf({ ...base, status: "CANCELLED" })).toBe("cancelled");
  });
});

describe("whether a score counts", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  const played = {
    scoreHome: 2,
    scoreAway: 1,
    scoreReportedAt: null as Date | null,
    scoreConfirmedAt: null as Date | null,
  };

  it("does not count a match with no score", () => {
    expect(
      isScoreCounted({ ...played, scoreHome: null, scoreAway: null }, now),
    ).toBe(false);
  });

  it("does not count half a score", () => {
    expect(isScoreCounted({ ...played, scoreAway: null }, now)).toBe(false);
  });

  it("counts a confirmed score immediately", () => {
    expect(
      isScoreCounted({ ...played, scoreConfirmedAt: new Date(now) }, now),
    ).toBe(true);
  });

  it("does not count a reported score inside the objection window", () => {
    const reportedJustNow = new Date(now.getTime() - 60_000);
    expect(isScoreCounted({ ...played, scoreReportedAt: reportedJustNow }, now)).toBe(
      false,
    );
  });

  it("counts a reported score once the window has passed", () => {
    // The whole point: correct the moment the window closes, whether or not
    // any nightly job has run.
    const old = new Date(now.getTime() - SCORE_CONFIRM_WINDOW_MS - 1);
    expect(isScoreCounted({ ...played, scoreReportedAt: old }, now)).toBe(true);
  });

  it("counts a score reported exactly at the boundary", () => {
    const exactly = confirmCutoff(now);
    expect(isScoreCounted({ ...played, scoreReportedAt: exactly }, now)).toBe(true);
  });

  it("does not count a score nobody reported", () => {
    expect(isScoreCounted(played, now)).toBe(false);
  });
});
