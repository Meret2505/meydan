package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

// --- Field detail (GET /fields/[id]) ---

@Serializable
data class FieldHoursDto(
    val day: String,
    val isOpen: Boolean,
    val start: String,
    val end: String,
)

@Serializable
data class AmenityDto(val ru: String, val tm: String)

@Serializable
data class ContactDto(val type: String, val value: String)

@Serializable
data class FieldDetailDto(
    val id: String,
    val name: String,
    val nameRu: String? = null,
    val nameTm: String? = null,
    val address: String,
    val addressRu: String? = null,
    val addressTm: String? = null,
    val district: String,
    val surface: String,
    val capacity: Int,
    val gamesPlayed: Int,
    val bodyRu: String? = null,
    val bodyTm: String? = null,
    val photos: List<String> = emptyList(),
    val hours: List<FieldHoursDto>? = null,
    val amenities: List<AmenityDto> = emptyList(),
    val contacts: List<ContactDto> = emptyList(),
)

// --- Team detail (GET /teams/[id]) ---

@Serializable
data class TeamMemberDto(
    val id: String,
    val name: String,
    val position: String? = null,
    val isCaptain: Boolean,
    val attendanceRate: Int? = null,
)

@Serializable
data class TeamDetailDto(
    val id: String,
    val name: String,
    val color: String? = null,
    val district: String? = null,
    val memberCount: Int,
    val wins: Int,
    val losses: Int,
    val points: Int,
    val members: List<TeamMemberDto> = emptyList(),
    /** Viewer context — drives the join/leave action. */
    val isMember: Boolean = false,
    /** Captains cannot leave; their exit is disbanding the team. */
    val isCaptain: Boolean = false,
)

/** Body of POST /teams. */
@Serializable
data class CreateTeamRequest(
    val name: String,
    val district: String? = null,
    val color: String? = null,
)

// --- Tournament detail (GET /tournaments/[id]) ---

@Serializable
data class TournamentTeamDto(val id: String, val name: String, val memberCount: Int)

@Serializable
data class StandingsRowDto(
    val teamId: String,
    val teamName: String,
    val played: Int,
    val won: Int,
    val drawn: Int,
    val lost: Int,
    val goalsFor: Int,
    val goalsAgainst: Int,
    val points: Int,
)

@Serializable
data class TournamentMatchDto(
    val id: String,
    val homeTeamName: String,
    val awayTeamName: String,
    val scoreHome: Int? = null,
    val scoreAway: Int? = null,
)

@Serializable
data class TournamentDetailDto(
    val id: String,
    val name: String,
    val startDate: String,
    val endDate: String? = null,
    val description: String? = null,
    val status: String,
    val teams: List<TournamentTeamDto> = emptyList(),
    val standings: List<StandingsRowDto> = emptyList(),
    val matches: List<TournamentMatchDto> = emptyList(),
)
