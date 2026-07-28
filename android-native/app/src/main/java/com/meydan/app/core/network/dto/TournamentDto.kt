package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * One tournament, mirroring TournamentCardDto in
 * lib/api/serializers/tournament.ts. `status` is computed server-side; the
 * client only filters its tabs by it.
 */
@Serializable
data class TournamentCardDto(
    val id: String,
    val name: String,
    val startDate: String,
    val endDate: String? = null,
    val teamsCount: Int,
    val matchesCount: Int,
    val status: String,
)

@Serializable
data class TournamentsResponse(val tournaments: List<TournamentCardDto>)
