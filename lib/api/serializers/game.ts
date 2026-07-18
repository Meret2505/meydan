import type { Position } from "@prisma/client";
import { gameFormat } from "@/lib/game-format";
import type { FeedGame, GameDetail } from "@/lib/services/game-queries";
import { absoluteImageUrl } from "../images";

export type GameCardDto = {
  id: string;
  scheduledAt: string;
  venue: string;
  district: string | null;
  format: string;
  totalSpots: number;
  joinedCount: number;
  pricePerPlayer: number | null;
  neededPositions: Position[];
  participants: { id: string; name: string; avatar: string | null }[];
  /** True when the viewer organizes this game (not merely joined it). */
  mine: boolean;
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
      avatar: absoluteImageUrl(p.user.avatar, origin),
    })),
    mine: game.organizerId === viewerId,
  };
}

export type GameDetailDto = {
  id: string;
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
  }[];
};

export function toGameDetailDto(detail: GameDetail, origin: string): GameDetailDto {
  const { game, organizerStats, isOrganizer, joined } = detail;
  const joinedCount = game.participants.length;

  return {
    id: game.id,
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
    })),
  };
}
