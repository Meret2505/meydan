package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.TeamsCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.TeamsResponse

/** Teams tab data with the offline-first read path shared by games/fields. */
class TeamsRepository(
    private val api: MeydanApi,
    private val teamsCache: TeamsCache,
) {
    suspend fun cached(): TeamsResponse? = teamsCache.load()

    suspend fun refresh(): ApiResult<TeamsResponse> {
        val result = apiCall { api.getTeams() }
        if (result is ApiResult.Success) teamsCache.save(result.data)
        return result
    }

    suspend fun clearCache() = teamsCache.clear()
}
