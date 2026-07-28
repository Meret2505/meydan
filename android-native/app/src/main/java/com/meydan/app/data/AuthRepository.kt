package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.FeedCache
import com.meydan.app.core.datastore.FieldsCache
import com.meydan.app.core.datastore.TokenStore
import com.meydan.app.core.datastore.UserCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.GoogleAuthRequest
import com.meydan.app.core.network.dto.MeResponse
import com.meydan.app.core.network.dto.PhoneAuthRequest
import com.meydan.app.core.network.dto.ProfilePatch
import com.meydan.app.core.network.dto.RefreshRequest
import com.meydan.app.core.network.dto.SessionDto
import com.meydan.app.core.network.dto.UserDto

/**
 * Owns authentication and the current-user profile.
 *
 * On a successful sign-in it persists the token pair before returning, so the
 * caller can navigate straight on and every later request is authenticated.
 */
class AuthRepository(
    private val api: MeydanApi,
    private val tokenStore: TokenStore,
    private val userCache: UserCache,
    private val feedCache: FeedCache,
    private val fieldsCache: FieldsCache,
) {
    suspend fun hasSession(): Boolean = tokenStore.hasSession()

    suspend fun cachedUser(): UserDto? = userCache.current()

    suspend fun phoneLogin(
        phone: String,
        password: String,
        apiLocale: String,
    ): ApiResult<SessionDto> {
        val result = apiCall {
            api.phoneAuth(PhoneAuthRequest(phone, password, apiLocale))
        }
        if (result is ApiResult.Success) persist(result.data)
        return result
    }

    suspend fun googleLogin(idToken: String): ApiResult<SessionDto> {
        val result = apiCall { api.googleAuth(GoogleAuthRequest(idToken)) }
        if (result is ApiResult.Success) persist(result.data)
        return result
    }

    /** Fetches the profile and refreshes the offline cache on success. */
    suspend fun getMe(): ApiResult<MeResponse> {
        val result = apiCall { api.getMe() }
        if (result is ApiResult.Success) userCache.save(result.data.user)
        return result
    }

    /**
     * Applies a profile patch. When onboarding completes the server returns a
     * re-minted access token; swap it in immediately so the next request is not
     * bounced by the stale onboarding claim.
     */
    suspend fun updateProfile(patch: ProfilePatch): ApiResult<MeResponse> {
        val result = apiCall { api.patchMe(patch) }
        if (result is ApiResult.Success) {
            result.data.accessToken?.let { tokenStore.updateAccessToken(it) }
            userCache.save(result.data.user)
        }
        return result
    }

    /** Revokes the refresh token server-side (best effort), then clears local state. */
    suspend fun logout() {
        val refresh = tokenStore.refreshToken()
        if (refresh != null) {
            runCatching { api.logout(RefreshRequest(refresh)) }
        }
        clearLocalSession()
    }

    /**
     * Wipes everything scoped to the signed-in user. Also called when a
     * refresh finally fails (forced logout), so a later account on this device
     * can never see the previous user's cached profile or feed.
     */
    suspend fun clearLocalSession() {
        tokenStore.clear()
        userCache.clear()
        feedCache.clear()
        fieldsCache.clear()
    }

    private suspend fun persist(session: SessionDto) {
        tokenStore.save(session.accessToken, session.refreshToken)
        userCache.save(session.user)
    }
}
