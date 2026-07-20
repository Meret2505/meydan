package com.meydan.app.core.network

import com.meydan.app.core.network.dto.ApiResponse
import com.meydan.app.core.network.dto.RefreshRequest
import com.meydan.app.core.network.dto.SessionDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * The refresh endpoint, on a bare Retrofit with NO auth interceptor or
 * authenticator attached.
 *
 * If the token authenticator called back into the interceptor'd client, a
 * failed refresh would itself 401 and trigger another refresh — an infinite
 * loop. Keeping refresh on its own plain client breaks that cycle.
 */
interface AuthApi {
    @POST("api/v1/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): Response<ApiResponse<SessionDto>>
}
