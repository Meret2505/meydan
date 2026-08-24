package com.meydan.app.core.network

import com.meydan.app.core.network.dto.ApiResponse
import com.meydan.app.core.network.dto.AvatarResponse
import com.meydan.app.core.network.dto.ProfileStatsDto
import okhttp3.MultipartBody
import com.meydan.app.core.network.dto.CreateGameRequest
import com.meydan.app.core.network.dto.CreateTeamRequest
import com.meydan.app.core.network.dto.CreateTournamentRequest
import com.meydan.app.core.network.dto.DisbandedDto
import com.meydan.app.core.network.dto.MatchResultRequest
import com.meydan.app.core.network.dto.RegisterTeamRequest
import com.meydan.app.core.network.dto.FcmTokenRequest
import com.meydan.app.core.network.dto.FavoriteResponse
import com.meydan.app.core.network.dto.FieldDetailDto
import com.meydan.app.core.network.dto.FieldsResponse
import com.meydan.app.core.network.dto.TeamDetailDto
import com.meydan.app.core.network.dto.TournamentDetailDto
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.core.network.dto.GamesFeedDto
import com.meydan.app.core.network.dto.TeamsResponse
import com.meydan.app.core.network.dto.TournamentsResponse
import com.meydan.app.core.network.dto.GoogleAuthRequest
import com.meydan.app.core.network.dto.MeResponse
import com.meydan.app.core.network.dto.NotificationsDto
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
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.Part
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

    @GET("api/v1/me/stats")
    suspend fun getMyStats(): Response<ApiResponse<ProfileStatsDto>>

    /** Multipart so the picked image streams through without base64 inflation. */
    @Multipart
    @POST("api/v1/me/avatar")
    suspend fun uploadAvatar(
        @Part file: MultipartBody.Part,
    ): Response<ApiResponse<AvatarResponse>>

    @HTTP(method = "DELETE", path = "api/v1/me/avatar")
    suspend fun removeAvatar(): Response<ApiResponse<AvatarResponse>>

    @POST("api/v1/me/fcm-token")
    suspend fun registerFcmToken(@Body body: FcmTokenRequest): Response<ApiResponse<Unit>>

    @GET("api/v1/games")
    suspend fun getGames(): Response<ApiResponse<GamesFeedDto>>

    @POST("api/v1/games")
    suspend fun createGame(@Body body: CreateGameRequest): Response<ApiResponse<GameDetailDto>>

    @GET("api/v1/games/{id}")
    suspend fun getGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    @POST("api/v1/games/{id}/join")
    suspend fun joinGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    // DELETE with no body needs the @HTTP form to keep Retrofit happy.
    @HTTP(method = "DELETE", path = "api/v1/games/{id}/join")
    suspend fun leaveGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    /** Organizer-only. Soft-deletes the game (status CANCELLED). */
    @HTTP(method = "DELETE", path = "api/v1/games/{id}")
    suspend fun cancelGame(@Path("id") id: String): Response<ApiResponse<GameDetailDto>>

    @GET("api/v1/fields")
    suspend fun getFields(): Response<ApiResponse<FieldsResponse>>

    @GET("api/v1/fields/{id}")
    suspend fun getFieldDetail(@Path("id") id: String): Response<ApiResponse<FieldDetailDto>>

    @GET("api/v1/teams/{id}")
    suspend fun getTeamDetail(@Path("id") id: String): Response<ApiResponse<TeamDetailDto>>

    @GET("api/v1/tournaments/{id}")
    suspend fun getTournamentDetail(@Path("id") id: String): Response<ApiResponse<TournamentDetailDto>>

    @POST("api/v1/tournaments")
    suspend fun createTournament(
        @Body body: CreateTournamentRequest,
    ): Response<ApiResponse<TournamentDetailDto>>

    /** Creator only (403). Soft-cancels; the row stays. */
    @HTTP(method = "DELETE", path = "api/v1/tournaments/{id}")
    suspend fun cancelTournament(
        @Path("id") id: String,
    ): Response<ApiResponse<TournamentDetailDto>>

    /** Enters one of the caller's teams. Captain only (403). */
    @POST("api/v1/tournaments/{id}/teams")
    suspend fun registerTeam(
        @Path("id") id: String,
        @Body body: RegisterTeamRequest,
    ): Response<ApiResponse<TournamentDetailDto>>

    @HTTP(method = "DELETE", path = "api/v1/tournaments/{id}/teams/{teamId}")
    suspend fun unregisterTeam(
        @Path("id") id: String,
        @Path("teamId") teamId: String,
    ): Response<ApiResponse<TournamentDetailDto>>

    /** Records a played match. Tournament creator only (403). */
    @POST("api/v1/tournaments/{id}/matches")
    suspend fun recordMatch(
        @Path("id") id: String,
        @Body body: MatchResultRequest,
    ): Response<ApiResponse<TournamentDetailDto>>

    @POST("api/v1/fields/{id}/favorite")
    suspend fun favoriteField(@Path("id") id: String): Response<ApiResponse<FavoriteResponse>>

    @HTTP(method = "DELETE", path = "api/v1/fields/{id}/favorite")
    suspend fun unfavoriteField(@Path("id") id: String): Response<ApiResponse<FavoriteResponse>>

    @GET("api/v1/teams")
    suspend fun getTeams(): Response<ApiResponse<TeamsResponse>>

    @POST("api/v1/teams")
    suspend fun createTeam(@Body body: CreateTeamRequest): Response<ApiResponse<TeamDetailDto>>

    @POST("api/v1/teams/{id}/members")
    suspend fun joinTeam(@Path("id") id: String): Response<ApiResponse<TeamDetailDto>>

    /** Captains cannot leave (403); disbanding is their exit. */
    @HTTP(method = "DELETE", path = "api/v1/teams/{id}/members")
    suspend fun leaveTeam(@Path("id") id: String): Response<ApiResponse<TeamDetailDto>>

    /** Captain removes a player. Removing yourself is refused (403). */
    @HTTP(method = "DELETE", path = "api/v1/teams/{id}/members/{userId}")
    suspend fun removeMember(
        @Path("id") id: String,
        @Path("userId") userId: String,
    ): Response<ApiResponse<TeamDetailDto>>

    /** Captain-only. Refused while the team still has games (409). */
    @HTTP(method = "DELETE", path = "api/v1/teams/{id}")
    suspend fun disbandTeam(@Path("id") id: String): Response<ApiResponse<DisbandedDto>>

    @GET("api/v1/tournaments")
    suspend fun getTournaments(): Response<ApiResponse<TournamentsResponse>>

    @GET("api/v1/notifications/unread-count")
    suspend fun unreadCount(): Response<ApiResponse<UnreadCountDto>>

    @GET("api/v1/notifications")
    suspend fun notifications(): Response<ApiResponse<NotificationsDto>>

    /** Marks every unread notification read, clearing the bell badge. */
    @POST("api/v1/notifications")
    suspend fun markNotificationsRead(): Response<ApiResponse<Unit>>
}
