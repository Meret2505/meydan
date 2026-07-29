package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.TournamentsCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.TournamentCardDto
import com.meydan.app.core.network.dto.TournamentDetailDto

/** Tournaments tab data with the offline-first read path. */
class TournamentsRepository(
    private val api: MeydanApi,
    private val tournamentsCache: TournamentsCache,
) {
    suspend fun cached(): List<TournamentCardDto>? = tournamentsCache.load()

    suspend fun refresh(): ApiResult<List<TournamentCardDto>> {
        val result = apiCall { api.getTournaments() }
        return when (result) {
            is ApiResult.Success -> {
                tournamentsCache.save(result.data.tournaments)
                ApiResult.Success(result.data.tournaments)
            }
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }
    }

    suspend fun detail(id: String): ApiResult<TournamentDetailDto> =
        apiCall { api.getTournamentDetail(id) }

    suspend fun clearCache() = tournamentsCache.clear()
}
