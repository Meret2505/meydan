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
