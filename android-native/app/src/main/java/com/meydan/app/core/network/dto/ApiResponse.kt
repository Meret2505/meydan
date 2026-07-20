package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * The envelope every /api/v1 endpoint returns, mirroring lib/api/response.ts:
 * `{ success, data?, error?, meta? }`.
 *
 * `data` is nullable because error responses omit it, and `error` is the
 * machine-readable code (e.g. "wrong_password", "game_full") the UI branches on.
 */
@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val meta: Meta? = null,
) {
    @Serializable
    data class Meta(val total: Int, val page: Int, val limit: Int)
}
