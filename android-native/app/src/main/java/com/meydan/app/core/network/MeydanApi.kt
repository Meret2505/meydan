package com.meydan.app.core.network

import com.meydan.app.core.network.dto.ApiResponse
import com.meydan.app.core.network.dto.FcmTokenRequest
import com.meydan.app.core.network.dto.FavoriteResponse
import com.meydan.app.core.network.dto.FieldsResponse
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.core.network.dto.GamesFeedDto
import com.meydan.app.core.network.dto.TeamsResponse
import com.meydan.app.core.network.dto.TournamentsResponse
import com.meydan.app.core.network.dto.GoogleAuthRequest
import com.meydan.app.core.network.dto.MeResponse
import com.meydan.app.core.network.dto.PhoneAuthRequest
import com.meydan.app.core.network.dto.ProfilePatch
import com.meydan.app.core.network.dto.RefreshRequest
import com.meydan.app.core.network.dto.SessionDto
import com.meydan.app.core.network.dto.UnreadCountDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * The /api/v1 surface. Every method returns Response<ApiResponse<T>> so callers
 * can read the HTTP status (for 401/409/429 branching) alongside the parsed
 * envelope.
 *
 * Auth headers are added by the OkHttp interceptor, not here — no method
 * declares an Authorization parameter.
 */
interface MeydanApi {

    @POST("api/v1/auth/phone")
    suspend fun phoneAuth(@Body body: PhoneAuthRequest): Response<ApiResponse<SessionDto>>

    @POST("api/v1/auth/google")
    suspend fun googleAuth(@Body body: GoogleAuthRequest): Response<ApiResponse<SessionDto>>

    @POST("api/v1/auth/logout")
    suspend fun logout(@Body body: RefreshRequest): Response<ApiResponse<Unit>>

    @GET("api/v1/me")
    suspend fun getMe(): Response<ApiResponse<MeResponse>>

    @PATCH("api/v1/me")
    suspend fun patchMe(@Body body: ProfilePatch): Response<ApiResponse<MeResponse>>

    @POST("api/v1/me/fcm-token")
    suspend fun registerFcmToken(@Body body: FcmTokenRequest): Response<ApiResponse<Unit>>

    @GET("api/v1/games")
    suspend fun getGames(): Response<ApiResponse<GamesFeedDto>>

    @GET("api/v1/games/{id}")
    suspend fun getGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    @POST("api/v1/games/{id}/join")
    suspend fun joinGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    // DELETE with no body needs the @HTTP form to keep Retrofit happy.
    @HTTP(method = "DELETE", path = "api/v1/games/{id}/join")
    suspend fun leaveGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    @GET("api/v1/fields")
    suspend fun getFields(): Response<ApiResponse<FieldsResponse>>

    @POST("api/v1/fields/{id}/favorite")
    suspend fun favoriteField(@Path("id") id: String): Response<ApiResponse<FavoriteResponse>>

    @HTTP(method = "DELETE", path = "api/v1/fields/{id}/favorite")
    suspend fun unfavoriteField(@Path("id") id: String): Response<ApiResponse<FavoriteResponse>>

    @GET("api/v1/teams")
    suspend fun getTeams(): Response<ApiResponse<TeamsResponse>>

    @GET("api/v1/tournaments")
    suspend fun getTournaments(): Response<ApiResponse<TournamentsResponse>>

    @GET("api/v1/notifications/unread-count")
    suspend fun unreadCount(): Response<ApiResponse<UnreadCountDto>>
}
