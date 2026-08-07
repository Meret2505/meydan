package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * The authenticated user's own profile, mirroring UserDto in
 * lib/api/serializers/user.ts. Avatar URLs arrive already absolute and proxied,
 * so Coil can load them directly.
 */
@Serializable
data class UserDto(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val avatar: String? = null,
    val position: String? = null,
    val skillLevel: String,
    val district: String? = null,
    val age: Int? = null,
    val isOpenToInvite: Boolean,
    val locale: String,
    val onboardingComplete: Boolean,
)

/** Response of GET /me and PATCH /me. PATCH includes a token when onboarding flips. */
@Serializable
data class MeResponse(
    val user: UserDto,
    val accessToken: String? = null,
)

/** Response of POST/DELETE /me/avatar — the new absolute URL, or null. */
@Serializable
data class AvatarResponse(val avatar: String? = null)

/** One recently completed game on the profile. */
@Serializable
data class RecentGameDto(
    val id: String,
    val scheduledAt: String,
    val venue: String,
    /** Null when the organizer never marked attendance. */
    val attended: Boolean? = null,
)

/** Response of GET /me/stats — the profile's attendance block. */
@Serializable
data class ProfileStatsDto(
    /** Percent, or null when nothing has been marked yet. */
    val attendanceRate: Int? = null,
    val gamesPlayed: Int = 0,
    val totalJoined: Int = 0,
    val recent: List<RecentGameDto> = emptyList(),
)

/** Body of PATCH /me — every field optional; only what changed is sent. */
@Serializable
data class ProfilePatch(
    val name: String? = null,
    val phone: String? = null,
    val position: String? = null,
    val district: String? = null,
    val age: String? = null,
    val locale: String? = null,
    val skillLevel: String? = null,
    val isOpenToInvite: Boolean? = null,
)
