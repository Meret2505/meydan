package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.NotificationsDto

/**
 * Notifications feed. No cache: the list is small, always wanted fresh, and the
 * bell is a deliberate navigation rather than a background surface, so a network
 * read on open is fine.
 */
class NotificationsRepository(
    private val api: MeydanApi,
) {
    suspend fun list(): ApiResult<NotificationsDto> =
        apiCall { api.notifications() }

    suspend fun markAllRead(): ApiResult<Unit> =
        apiCall { api.markNotificationsRead() }
}
