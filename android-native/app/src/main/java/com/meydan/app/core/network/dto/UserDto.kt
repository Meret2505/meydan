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
