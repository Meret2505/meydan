import type { Game } from "@prisma/client";

/**
 * What state a team match is in, derived from its columns.
 *
 * There is no `MatchState` column and deliberately no new enum. The state is
 * a pure function of four nullable timestamps plus the `GameStatus` an
 * ordinary game already carries, which means it cannot drift out of step with
 * the row the way a denormalised status does — and it means every rule about
 * who may do what is testable without a database.
 *
 * `agreedAt` and `declinedAt` are separate rather than one `respondedAt`
 * because an *agreed* match that the home captain later calls off must read
 * as cancelled, not declined. With one timestamp those two collapse. Both are
 * monotone — set once, never cleared — so the derivation has no ordering
 * ambiguity.
 */
export type MatchState =
  /** Posted to the feed with no opponent yet; any eligible captain may take it. */
  | "open_call"
  /** A specific team was challenged and has not answered. */
  | "pending"
  /** The challenged captain said no. */
  | "declined"
  /** Called off by the home captain, at any point before kickoff. */
  | "cancelled"
  /** Both teams are in, kickoff is ahead. */
  | "agreed"
  /** Kickoff has passed and nobody has entered a score. */
  | "played"
  /** One captain entered a score; the other has not answered yet. */
  | "score_reported"
  /** Counted toward both teams' records. */
  | "score_confirmed";

/**
 * The columns the state is read from. A `Pick` so queries can select narrowly
 * — the feed already avoids fetching whole `Game` rows.
 */
export type MatchRow = Pick<
  Game,
  | "status"
  | "awayTeamId"
  | "agreedAt"
  | "declinedAt"
  | "scoreReportedAt"
  | "scoreConfirmedAt"
>;

export function matchStateOf(game: MatchRow): MatchState {
  // Declined before cancelled: declining also cancels the game, and the
  // timestamp is what tells the two apart.
  if (game.declinedAt !== null) return "declined";
  if (game.status === "CANCELLED") return "cancelled";
  if (game.scoreConfirmedAt !== null) return "score_confirmed";
  if (game.scoreReportedAt !== null) return "score_reported";
  if (game.status === "COMPLETED") return "played";
  if (game.awayTeamId === null) return "open_call";
  if (game.agreedAt === null) return "pending";
  return "agreed";
}

/**
 * How long the opposing captain has to answer a reported score.
 *
 * Long enough to cover a weekend the other captain spent away from the app,
 * short enough that a team's record is not held hostage by one silent person.
 */
export const SCORE_CONFIRM_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Scores reported at or before this moment have run out of objection time. */
export function confirmCutoff(now: Date): Date {
  return new Date(now.getTime() - SCORE_CONFIRM_WINDOW_MS);
}

type ScoreRow = Pick<
  Game,
  "scoreHome" | "scoreAway" | "scoreReportedAt" | "scoreConfirmedAt"
>;

/**
 * Whether this score counts toward the teams' records.
 *
 * Asked of the row, not of a materialised flag, so the answer is right the
 * moment the window passes even if the nightly pass never runs. That matters
 * more here than anywhere: team records read 0-0-0 today precisely because
 * they were made to depend on something nothing ever wrote, and rebuilding
 * that dependency on a daily cron would be the same failure with a new shape.
 * The nightly pass only makes the read cheap and sends the notification.
 */
export function isScoreCounted(game: ScoreRow, now: Date): boolean {
  if (game.scoreHome === null || game.scoreAway === null) return false;
  if (game.scoreConfirmedAt !== null) return true;
  if (game.scoreReportedAt === null) return false;
  return game.scoreReportedAt <= confirmCutoff(now);
}
