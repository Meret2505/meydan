package com.meydan.app.core.common

import com.meydan.app.core.network.dto.ApiResponse
import retrofit2.Response

/**
 * The outcome of a network call, in terms the UI can act on directly.
 *
 * Repositories translate raw Retrofit responses into this so ViewModels never
 * touch HTTP status codes: a 409 with error "game_full" becomes
 * `Failure(code = "game_full")`, and a dropped connection becomes
 * `NetworkError`, which the UI shows differently (retry vs. explain).
 */
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>

    /** The server answered with an error envelope. [code] is its machine code. */
    data class Failure(val httpStatus: Int, val code: String) : ApiResult<Nothing>

    /** No usable response — offline, timeout, DNS. Distinct from a server error. */
    data object NetworkError : ApiResult<Nothing>
}

/**
 * Runs a Retrofit call and folds it into an [ApiResult].
 *
 * A thrown IOException (offline, timeout) becomes [ApiResult.NetworkError]; a
 * non-2xx or a `success: false` envelope becomes [ApiResult.Failure] carrying
 * the server's error code; a 2xx with data becomes [ApiResult.Success].
 */
inline fun <T> apiCall(block: () -> Response<ApiResponse<T>>): ApiResult<T> {
    val response = try {
        block()
    } catch (e: Exception) {
        return ApiResult.NetworkError
    }

    val body = response.body()
    return when {
        response.isSuccessful && body?.success == true && body.data != null ->
            ApiResult.Success(body.data)
        else ->
            ApiResult.Failure(
                httpStatus = response.code(),
                code = body?.error ?: errorBodyCode(response) ?: "unknown",
            )
    }
}

/** Best-effort parse of the error code from a non-2xx body. */
fun errorBodyCode(response: Response<*>): String? =
    try {
        response.errorBody()?.string()
            ?.let { Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(it)?.groupValues?.get(1) }
    } catch (e: Exception) {
        null
    }
