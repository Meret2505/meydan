package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/** One card in the feed, mirroring GameCardDto in lib/api/serializers/game.ts. */
@Serializable
data class GameCardDto(
    val id: String,
    val scheduledAt: String,
    val venue: String,
    val district: String? = null,
    val format: String,
    val totalSpots: Int,
    val joinedCount: Int,
    val pricePerPlayer: Int? = null,
    val neededPositions: List<String>,
    val participants: List<ParticipantDto>,
    val mine: Boolean,
    /** "OPEN" for an ordinary game, "TEAM_MATCH" for two teams. */
    val type: String = "OPEN",
    /** Both null on an ordinary game; [awayTeam] null on an open call. */
    val homeTeam: TeamBadgeDto? = null,
    val awayTeam: TeamBadgeDto? = null,
    /** open_call / pending / agreed / … — null on an ordinary game. */
    val matchState: String? = null,
)

/** The two buckets GET /games returns. */
@Serializable
data class GamesFeedDto(
    val open: List<GameCardDto>,
    val mine: List<GameCardDto>,
    /**
     * Unread notifications, shipped with the feed so the badge costs no
     * separate round trip. Defaulted, so a cached payload written by an older
     * build still parses.
     */
    val unread: Int = 0,
)

@Serializable
data class ParticipantDto(
    val id: String,
    val name: String,
    val avatar: String? = null,
    val position: String? = null,
    val attended: Boolean? = null,
    /** Which side they played for; null on an ordinary game. */
    val teamId: String? = null,
)

/** Full game detail, mirroring GameDetailDto. */
@Serializable
data class GameDetailDto(
    val id: String,
    val scheduledAt: String,
    val status: String,
    val venue: String,
    val district: String? = null,
    val fieldId: String? = null,
    val totalSpots: Int,
    val joinedCount: Int,
    val openSlots: Int,
    val pricePerPlayer: Int? = null,
    val neededPositions: List<String>,
    val notes: String? = null,
    val scoreHome: Int? = null,
    val scoreAway: Int? = null,
    val format: String,
    val isOrganizer: Boolean,
    val joined: Boolean,
    val isFull: Boolean,
    val isPast: Boolean,
    val organizer: OrganizerDto,
    val participants: List<ParticipantDto>,
    /** "OPEN" for an ordinary game, "TEAM_MATCH" for two teams. */
    val type: String = "OPEN",
    /** Both null on an ordinary game; [awayTeam] null on an open call. */
    val homeTeam: TeamBadgeDto? = null,
    val awayTeam: TeamBadgeDto? = null,
    /** open_call / pending / agreed / … — null on an ordinary game. */
    val matchState: String? = null,
    /**
     * Which side the viewer is on, and whether they speak for it. Decided by
     * the server: knowing you captain *some* team says nothing about this one.
     */
    val viewerSide: String? = null,
    val viewerIsCaptain: Boolean = false,
)

@Serializable
data class OrganizerDto(
    val id: String,
    val name: String,
    val avatar: String? = null,
    /** Null unless the viewer joined — enforced server-side. */
    val phone: String? = null,
    val gamesPlayed: Int,
    val attendanceRate: Int? = null,
)

/** Body of POST /api/v1/games. Either fieldId or fieldName must be set. */
@Serializable
data class CreateGameRequest(
    val scheduledAt: String,
    val fieldId: String? = null,
    val fieldName: String? = null,
    val totalSpots: Int,
    val pricePerPlayer: Int? = null,
    val notes: String? = null,
    val neededPositions: List<String>,
)

@Serializable
data class UnreadCountDto(val count: Int)

@Serializable
data class FcmTokenRequest(val token: String)

/**
 * Writing up a played game. Both halves are optional on their own but not
 * together: attendance alone is a valid write-up (it is what the reliability
 * ratings are built from) and so is a score alone.
 *
 * [attended] is keyed by user id; a player left out keeps whatever they had.
 */
@Serializable
data class RecordResultRequest(
    val scoreHome: Int? = null,
    val scoreAway: Int? = null,
    val attended: Map<String, Boolean> = emptyMap(),
)

/** Enough of a team to draw a crest and a name on a card. */
@Serializable
data class TeamBadgeDto(
    val id: String,
    val name: String,
    val color: String? = null,
)

/** Body of POST /api/v1/matches. Omit [opponentTeamId] for an open call. */
@Serializable
data class CreateMatchRequest(
    val homeTeamId: String,
    val opponentTeamId: String? = null,
    val scheduledAt: String,
    val fieldId: String? = null,
    val fieldName: String? = null,
    /** Players per side; the server defaults to 5. */
    val format: Int? = null,
    val notes: String? = null,
)

/** Body of POST /api/v1/games/{id}/accept — which of my teams is playing. */
@Serializable
data class AcceptMatchRequest(val teamId: String)

/**
 * Body of POST /api/v1/games/{id}/score.
 *
 * Scores are home-relative whoever enters them, so the screen labels the two
 * boxes with team names rather than "home" and "away". [attended] is accepted
 * only for the reporter's own side.
 */
@Serializable
data class ReportMatchScoreRequest(
    val scoreHome: Int,
    val scoreAway: Int,
    val attended: Map<String, Boolean> = emptyMap(),
)
