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

@Serializable
data class UnreadCountDto(val count: Int)

@Serializable
data class FcmTokenRequest(val token: String)
