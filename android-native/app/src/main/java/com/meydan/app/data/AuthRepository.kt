package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.FeedCache
import com.meydan.app.core.datastore.FieldsCache
import com.meydan.app.core.datastore.TeamsCache
import com.meydan.app.core.datastore.TokenStore
import com.meydan.app.core.datastore.TournamentsCache
import com.meydan.app.core.datastore.UserCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.AvatarResponse
import com.meydan.app.core.network.dto.GoogleAuthRequest
import com.meydan.app.core.network.dto.ProfileStatsDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
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
    private val teamsCache: TeamsCache,
    private val tournamentsCache: TournamentsCache,
) {
    suspend fun hasSession(): Boolean = tokenStore.hasSession()

    suspend fun cachedUser(): UserDto? = userCache.current()

    /**
     * The cached profile as a stream. Screens that must reflect edits made
     * elsewhere (e.g. the profile tab after profile editing) observe this so a
     * cache write updates them without re-fetching.
     */
    val cachedUserFlow: kotlinx.coroutines.flow.Flow<UserDto?> = userCache.user

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

    /** The profile's attendance block. Not cached — cheap and always fresh. */
    suspend fun myStats(): ApiResult<ProfileStatsDto> = apiCall { api.getMyStats() }

    /**
     * Uploads a new avatar. The picked image arrives as raw bytes (read from the
     * content URI by the caller, which owns the ContentResolver).
     */
    suspend fun uploadAvatar(
        bytes: ByteArray,
        mime: String,
        filename: String,
    ): ApiResult<AvatarResponse> {
        val part = MultipartBody.Part.createFormData(
            "file",
            filename,
            bytes.toRequestBody(mime.toMediaTypeOrNull()),
        )
        val result = apiCall { api.uploadAvatar(part) }
        if (result is ApiResult.Success) refreshCachedUser()
        return result
    }

    suspend fun removeAvatar(): ApiResult<AvatarResponse> {
        val result = apiCall { api.removeAvatar() }
        if (result is ApiResult.Success) refreshCachedUser()
        return result
    }

    /**
     * The avatar endpoints return only the URL, so pull a fresh /me to keep the
     * cached user (and every screen observing it) in step.
     */
    private suspend fun refreshCachedUser() {
        (apiCall { api.getMe() } as? ApiResult.Success)?.let { userCache.save(it.data.user) }
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
        teamsCache.clear()
        tournamentsCache.clear()
    }

    private suspend fun persist(session: SessionDto) {
        tokenStore.save(session.accessToken, session.refreshToken)
        userCache.save(session.user)
    }
}
