import { describe, expect, it } from "vitest";
import { attendanceTier, foldAttendance, playerStatsFrom } from "./stats";

/**
 * The arithmetic and the fold are pure so they can be checked without a
 * database. What matters here is that asking for a whole roster at once gives
 * exactly what asking per player used to give — that is what makes replacing
 * the per-member query safe.
 */
describe("playerStatsFrom", () => {
  it("reports a percentage rounded to whole points", () => {
    expect(playerStatsFrom(2, 3)).toEqual({
      gamesPlayed: 2,
      attendanceRate: 67,
      totalJoined: 3,
    });
  });

  it("has no rate at all for a player who never had attendance recorded", () => {
    // null, not 0 — "no data" and "never showed up" are different things, and
    // attendanceTier turns them into "new" versus "poor".
    expect(playerStatsFrom(0, 0)).toEqual({
      gamesPlayed: 0,
      attendanceRate: null,
      totalJoined: 0,
    });
  });

  it("reports 0 for a player who was marked absent every time", () => {
    expect(playerStatsFrom(0, 4).attendanceRate).toBe(0);
  });

  it("reports 100 for a perfect record", () => {
    expect(playerStatsFrom(5, 5).attendanceRate).toBe(100);
  });
});

describe("foldAttendance", () => {
  const rows = [
    { userId: "a", attended: true, _count: { _all: 3 } },
    { userId: "a", attended: false, _count: { _all: 1 } },
    { userId: "b", attended: true, _count: { _all: 2 } },
    { userId: "c", attended: false, _count: { _all: 2 } },
  ];

  it("splits one grouped query into per-player stats", () => {
    const byUser = foldAttendance(rows);
    expect(byUser.get("a")).toEqual({ gamesPlayed: 3, attendanceRate: 75, totalJoined: 4 });
    expect(byUser.get("b")).toEqual({ gamesPlayed: 2, attendanceRate: 100, totalJoined: 2 });
    expect(byUser.get("c")).toEqual({ gamesPlayed: 0, attendanceRate: 0, totalJoined: 2 });
  });

  it("leaves out players with no recorded attendance rather than inventing zeros", () => {
    // The caller substitutes an empty tally, so a roster newcomer reads as
    // "new" instead of "0% reliable".
    expect(foldAttendance(rows).has("d")).toBe(false);
  });

  it("returns an empty map for no rows", () => {
    expect(foldAttendance([]).size).toBe(0);
  });

  it("ignores a null attendance group, as the query's filter already does", () => {
    const byUser = foldAttendance([
      { userId: "a", attended: true, _count: { _all: 1 } },
      { userId: "a", attended: null, _count: { _all: 9 } },
    ]);
    expect(byUser.get("a")).toEqual({ gamesPlayed: 1, attendanceRate: 100, totalJoined: 1 });
  });
});

describe("attendanceTier", () => {
  it("maps a missing rate to new, not poor", () => {
    expect(attendanceTier(null)).toBe("new");
  });

  it("keeps its boundaries inclusive", () => {
    expect(attendanceTier(80)).toBe("reliable");
    expect(attendanceTier(79)).toBe("ok");
    expect(attendanceTier(50)).toBe("ok");
    expect(attendanceTier(49)).toBe("poor");
  });
});
