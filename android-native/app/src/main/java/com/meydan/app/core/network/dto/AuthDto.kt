package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/** Body of POST /api/v1/auth/phone. */
@Serializable
data class PhoneAuthRequest(
    val phone: String,
    val password: String,
    val locale: String,
)

/** Body of POST /api/v1/auth/google. */
@Serializable
data class GoogleAuthRequest(val idToken: String)

/** Body of POST /api/v1/auth/refresh and /logout. */
@Serializable
data class RefreshRequest(val refreshToken: String)

/**
 * A minted session, returned by the auth endpoints. `isNewSignup` is present
 * only on the phone response and tells the client whether to route into
 * onboarding.
 */
@Serializable
data class SessionDto(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: UserDto,
    val isNewSignup: Boolean = false,
)
