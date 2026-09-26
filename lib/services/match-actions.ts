import type { Game } from "@prisma/client";
import { matchStateOf, type MatchRow } from "@/lib/services/match-state";

/**
 * What a given person may do with a given match.
 *
 * One table, on the server, because the services enforce these rules anyway
 * and a client re-deriving them is how the two drift into offering buttons
 * that come back 403. The client decides layout; this decides permission.
 *
 * Pure, so the whole table is testable without a database — the callers pass
 * in the memberships they already had to read.
 */

export type MatchAction =
  | "ACCEPT"
  | "DECLINE"
  | "CANCEL"
  | "REPORT_SCORE"
  | "CONFIRM_SCORE"
  | "REJECT_SCORE";

export type Viewer = {
  /** Captains the home team of this match. */
  captainsHome: boolean;
  /** Captains the away team of this match. */
  captainsAway: boolean;
  /**
   * Captains at least one *other* eligible team — the only thing that lets
   * someone take an open call.
   */
  canAnswerOpenCall: boolean;
};

type ActionRow = MatchRow & Pick<Game, "scoreReportedByTeamId" | "teamId">;

export function matchActionsFor(game: ActionRow, viewer: Viewer): MatchAction[] {
  const state = matchStateOf(game);

  switch (state) {
    case "open_call":
      // The home side can only call it off; anyone else with a team of their
      // own can take it.
      if (viewer.captainsHome) return ["CANCEL"];
      return viewer.canAnswerOpenCall ? ["ACCEPT"] : [];

    case "pending":
      if (viewer.captainsAway) return ["ACCEPT", "DECLINE"];
      // Withdrawing an unanswered challenge is the same button as calling off
      // an agreed match, and means the same thing to the person pressing it.
      if (viewer.captainsHome) return ["CANCEL"];
      return [];

    case "agreed":
      // Either captain may call it off once both have committed: by then the
      // other side is equally entitled to pull out.
      return viewer.captainsHome || viewer.captainsAway ? ["CANCEL"] : [];

    case "played":
      return viewer.captainsHome || viewer.captainsAway ? ["REPORT_SCORE"] : [];

    case "score_reported": {
      // Whoever did not report it answers. The reporter may correct their own
      // entry until it is answered — a typo should not need the other side's
      // permission to fix.
      const reportedByHome = game.scoreReportedByTeamId === game.teamId;
      const answering = reportedByHome ? viewer.captainsAway : viewer.captainsHome;
      if (answering) return ["CONFIRM_SCORE", "REJECT_SCORE"];
      const reporting = reportedByHome ? viewer.captainsHome : viewer.captainsAway;
      return reporting ? ["REPORT_SCORE"] : [];
    }

    case "score_confirmed":
    case "declined":
    case "cancelled":
      // Settled. A confirmed score is the record both teams agreed on, and
      // reopening it would make the confirmation meaningless.
      return [];
  }
}
