import type { Position } from "@prisma/client";
import { gameFormat } from "@/lib/game-format";
import type { FeedGame, GameDetail } from "@/lib/services/game-queries";
import { matchStateOf, type MatchState } from "@/lib/services/match-state";
import { absoluteImageUrl } from "../images";

/** Enough of a team to draw a crest and a name on a card. */
export type TeamBadgeDto = { id: string; name: string; color: string | null };

export type GameCardDto = {
  id: string;
  /** "OPEN" for an ordinary game, "TEAM_MATCH" for two teams. */
  type: string;
  scheduledAt: string;
  venue: string;
  district: string | null;
  format: string;
  totalSpots: number;
  joinedCount: number;
  pricePerPlayer: number | null;
  neededPositions: Position[];
  /**
   * Only what a card draws: it renders initials from the names. Avatars,
   * positions and attendance belong to the detail payload, and were being
   * downloaded for every player of every game in the feed and discarded.
   */
  participants: { id: string; name: string }[];
  /** True when the viewer organizes this game (not merely joined it). */
  mine: boolean;
  /** Both null on an ordinary game; `awayTeam` null on an open call. */
  homeTeam: TeamBadgeDto | null;
  awayTeam: TeamBadgeDto | null;
  /** Null on an ordinary game. See lib/services/match-state.ts. */
  matchState: MatchState | null;
};

/**
 * Feed card. `venue` collapses the field name and the free-text custom venue
 * into one display string, matching the web card, so the client does not have
 * to re-implement that fallback.
 */
export function toGameCardDto(
  game: FeedGame,
  origin: string,
  viewerId: string,
): GameCardDto {
  return {
    id: game.id,
    type: game.type,
    scheduledAt: game.scheduledAt.toISOString(),
    venue: game.field?.name ?? game.fieldName ?? "—",
    district: game.field?.district ?? null,
    format: gameFormat(game),
    totalSpots: game.totalSpots,
    joinedCount: game.participants.length,
    pricePerPlayer: game.pricePerPlayer,
    neededPositions: game.neededPositions,
    participants: game.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
    })),
    mine: game.organizerId === viewerId,
    homeTeam: game.team,
    awayTeam: game.awayTeam,
    matchState: game.type === "TEAM_MATCH" ? matchStateOf(game) : null,
  };
}

export type GameDetailDto = {
  id: string;
  /** "OPEN" for an ordinary game, "TEAM_MATCH" for two teams. */
  type: string;
  scheduledAt: string;
  status: string;
  venue: string;
  district: string | null;
  fieldId: string | null;
  totalSpots: number;
  joinedCount: number;
  openSlots: number;
  pricePerPlayer: number | null;
  neededPositions: Position[];
  notes: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  format: string;
  isOrganizer: boolean;
  joined: boolean;
  isFull: boolean;
  isPast: boolean;
  organizer: {
    id: string;
    name: string;
    avatar: string | null;
    /** Null unless the viewer has joined — see the note in the code. */
    phone: string | null;
    gamesPlayed: number;
    attendanceRate: number | null;
  };
  participants: {
    id: string;
    name: string;
    avatar: string | null;
    position: Position | null;
    attended: boolean | null;
    /** Which side they played for; null on an ordinary game. */
    teamId: string | null;
  }[];
  homeTeam: TeamBadgeDto | null;
  awayTeam: TeamBadgeDto | null;
  matchState: MatchState | null;
  /**
   * Which side the viewer is on, and whether they speak for it. Decided
   * server-side: a client knowing it captains *some* team is exactly the
   * wrong basis for offering it an action on *this* one.
   */
  viewerSide: "HOME" | "AWAY" | null;
  viewerIsCaptain: boolean;
  /**
   * What this viewer may do with this match, decided here.
   *
   * The server enforces every one of these rules anyway; re-deriving them in
   * two clients is how the two drift apart and start offering buttons that
   * 403. The client decides layout, not permission.
   */
  viewerActions: MatchAction[];
  /**
   * Teams the viewer could answer an open call with. Empty unless the match
   * is an open call they are eligible for; more than one means ask.
   */
  acceptableBy: { id: string; name: string }[];
};

export type MatchAction =
  | "ACCEPT"
  | "DECLINE"
  | "CANCEL"
  | "REPORT_SCORE"
  | "CONFIRM_SCORE"
  | "REJECT_SCORE";

export function toGameDetailDto(detail: GameDetail, origin: string): GameDetailDto {
  const { game, organizerStats, isOrganizer, joined, viewerSide, viewerIsCaptain } = detail;
  const joinedCount = game.participants.length;

  return {
    id: game.id,
    type: game.type,
    scheduledAt: game.scheduledAt.toISOString(),
    status: game.status,
    venue: game.field?.name ?? game.fieldName ?? "—",
    district: game.field?.district ?? null,
    fieldId: game.fieldId,
    totalSpots: game.totalSpots,
    joinedCount,
    openSlots: Math.max(0, game.totalSpots - joinedCount),
    pricePerPlayer: game.pricePerPlayer,
    neededPositions: game.neededPositions,
    notes: game.notes,
    scoreHome: game.scoreHome,
    scoreAway: game.scoreAway,
    format: gameFormat(game),
    isOrganizer,
    joined,
    isFull: joinedCount >= game.totalSpots,
    isPast: game.scheduledAt.getTime() < Date.now(),
    organizer: {
      id: game.organizer.id,
      name: game.organizer.name,
      avatar: absoluteImageUrl(game.organizer.avatar, origin),
      // Privacy gate, mirroring the web detail page: the organizer's number is
      // revealed only to players who actually joined. This must be enforced
      // here rather than hidden in the UI — a native client that simply chose
      // not to render the field would still have received it.
      phone: joined || isOrganizer ? game.organizer.phone : null,
      gamesPlayed: organizerStats.gamesPlayed,
      attendanceRate: organizerStats.attendanceRate,
    },
    participants: game.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      avatar: absoluteImageUrl(p.user.avatar, origin),
      position: p.user.position,
      attended: p.attended,
      teamId: p.teamId,
    })),
    homeTeam: game.team,
    awayTeam: game.awayTeam,
    matchState: game.type === "TEAM_MATCH" ? matchStateOf(game) : null,
    viewerSide,
    viewerIsCaptain,
    viewerActions: detail.viewerActions,
    acceptableBy: detail.acceptableBy,
  };
}
