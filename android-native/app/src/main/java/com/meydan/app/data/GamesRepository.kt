package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.FeedCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.core.network.dto.GamesFeedDto

/**
 * Games feed with an offline-first read path: the UI renders whatever
 * [cachedFeed] returns immediately, then [refresh] replaces it from the
 * network and re-persists. A failed refresh leaves the cache untouched, so
 * poor connectivity degrades to stale-but-visible data — the requirement the
 * old WebView shell could never meet.
 */
class GamesRepository(
    private val api: MeydanApi,
    private val feedCache: FeedCache,
) {
    suspend fun cachedFeed(): GamesFeedDto? = feedCache.load()

    suspend fun refresh(): ApiResult<GamesFeedDto> {
        val result = apiCall { api.getGames() }
        if (result is ApiResult.Success) feedCache.save(result.data)
        return result
    }

    suspend fun gameDetail(id: String): ApiResult<GameDetailDto> =
        apiCall { api.getGame(id) }

    /** Join returns the updated detail (roster, counts, joined flag). */
    suspend fun joinGame(id: String): ApiResult<GameDetailDto> =
        apiCall { api.joinGame(id) }

    /** Leave returns the updated detail. Organizers cannot leave (403). */
    suspend fun leaveGame(id: String): ApiResult<GameDetailDto> =
        apiCall { api.leaveGame(id) }

    suspend fun unreadCount(): ApiResult<Int> =
        when (val result = apiCall { api.unreadCount() }) {
            is ApiResult.Success -> ApiResult.Success(result.data.count)
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }

    /** On logout the next account must not see this user's feed. */
    suspend fun clearCache() = feedCache.clear()
}
