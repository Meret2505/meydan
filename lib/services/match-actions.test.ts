import { describe, expect, it } from "vitest";
import { matchActionsFor, type Viewer } from "@/lib/services/match-actions";

/**
 * The permission table, one row per (state × who is looking).
 *
 * These are the rules two clients would otherwise each re-derive, so the
 * table is the contract: a button the client draws is a button this said
 * yes to.
 */
describe("what a viewer may do with a match", () => {
  const HOME = "team-home";
  const AWAY = "team-away";

  const homeCaptain: Viewer = { captainsHome: true, captainsAway: false, canAnswerOpenCall: true };
  const awayCaptain: Viewer = { captainsHome: false, captainsAway: true, canAnswerOpenCall: true };
  const otherCaptain: Viewer = {
    captainsHome: false,
    captainsAway: false,
    canAnswerOpenCall: true,
  };
  const player: Viewer = { captainsHome: false, captainsAway: false, canAnswerOpenCall: false };
  const homePlayer: Viewer = { captainsHome: false, captainsAway: false, canAnswerOpenCall: false };

  const match = (over: Partial<Parameters<typeof matchActionsFor>[0]> = {}) => ({
    status: "OPEN" as const,
    teamId: HOME,
    awayTeamId: AWAY as string | null,
    agreedAt: null as Date | null,
    declinedAt: null as Date | null,
    scoreReportedAt: null as Date | null,
    scoreConfirmedAt: null as Date | null,
    scoreReportedByTeamId: null as string | null,
    ...over,
  });

  const openCall = () => match({ awayTeamId: null });
  const agreed = () => match({ status: "FULL", agreedAt: new Date() });
  const played = () => match({ status: "COMPLETED", agreedAt: new Date() });
  const reportedBy = (teamId: string) =>
    match({
      status: "COMPLETED",
      agreedAt: new Date(),
      scoreReportedAt: new Date(),
      scoreReportedByTeamId: teamId,
    });

  describe("an open call", () => {
    it("is taken by an outside captain with a team of their own", () => {
      expect(matchActionsFor(openCall(), otherCaptain)).toEqual(["ACCEPT"]);
    });

    it("offers nothing to a player with no team to bring", () => {
      expect(matchActionsFor(openCall(), player)).toEqual([]);
    });

    it("can only be called off by the side that posted it", () => {
      expect(matchActionsFor(openCall(), homeCaptain)).toEqual(["CANCEL"]);
    });
  });

  describe("a pending challenge", () => {
    it("is answered by the captain who was asked", () => {
      expect(matchActionsFor(match(), awayCaptain)).toEqual(["ACCEPT", "DECLINE"]);
    });

    it("can be withdrawn by the captain who sent it", () => {
      expect(matchActionsFor(match(), homeCaptain)).toEqual(["CANCEL"]);
    });

    it("offers nothing to the squads or to strangers", () => {
      expect(matchActionsFor(match(), homePlayer)).toEqual([]);
      expect(matchActionsFor(match(), otherCaptain)).toEqual([]);
    });
  });

  describe("once agreed", () => {
    it("either captain may call it off", () => {
      // By now both sides have committed, so both are equally entitled to
      // pull out — unlike a challenge, which is the sender's to withdraw.
      expect(matchActionsFor(agreed(), homeCaptain)).toEqual(["CANCEL"]);
      expect(matchActionsFor(agreed(), awayCaptain)).toEqual(["CANCEL"]);
    });

    it("a squad member has nothing to press", () => {
      expect(matchActionsFor(agreed(), homePlayer)).toEqual([]);
    });
  });

  describe("after it is played", () => {
    it("either captain may enter the score", () => {
      expect(matchActionsFor(played(), homeCaptain)).toEqual(["REPORT_SCORE"]);
      expect(matchActionsFor(played(), awayCaptain)).toEqual(["REPORT_SCORE"]);
    });

    it("the other captain answers a reported score", () => {
      expect(matchActionsFor(reportedBy(HOME), awayCaptain)).toEqual([
        "CONFIRM_SCORE",
        "REJECT_SCORE",
      ]);
      expect(matchActionsFor(reportedBy(AWAY), homeCaptain)).toEqual([
        "CONFIRM_SCORE",
        "REJECT_SCORE",
      ]);
    });

    it("the captain who reported it may correct it, not confirm it", () => {
      // A typo should not need the other side's permission to fix — but
      // confirming your own entry would make confirmation meaningless.
      expect(matchActionsFor(reportedBy(HOME), homeCaptain)).toEqual(["REPORT_SCORE"]);
    });
  });

  describe("once settled", () => {
    it("a confirmed score is nobody's to reopen", () => {
      const confirmed = match({
        status: "COMPLETED",
        agreedAt: new Date(),
        scoreReportedAt: new Date(),
        scoreReportedByTeamId: HOME,
        scoreConfirmedAt: new Date(),
      });

      expect(matchActionsFor(confirmed, homeCaptain)).toEqual([]);
      expect(matchActionsFor(confirmed, awayCaptain)).toEqual([]);
    });

    it("a declined or cancelled match offers nothing to anyone", () => {
      const declined = match({ status: "CANCELLED", declinedAt: new Date() });
      const cancelled = match({ status: "CANCELLED", agreedAt: new Date() });

      expect(matchActionsFor(declined, homeCaptain)).toEqual([]);
      expect(matchActionsFor(cancelled, awayCaptain)).toEqual([]);
    });
  });
});
