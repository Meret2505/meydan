package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/** One team, mirroring TeamCardDto in lib/api/serializers/team.ts. */
@Serializable
data class TeamCardDto(
    val id: String,
    val name: String,
    val color: String? = null,
    val district: String? = null,
    val memberCount: Int,
    val gamesCount: Int,
    val captainName: String? = null,
    val mine: Boolean,
)

/** The two buckets GET /teams returns: the user's teams and the city ranking. */
@Serializable
data class TeamsResponse(
    val mine: List<TeamCardDto>,
    val others: List<TeamCardDto>,
)
