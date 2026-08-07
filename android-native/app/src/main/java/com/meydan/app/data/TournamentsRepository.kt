package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.TournamentsCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.CreateTournamentRequest
import com.meydan.app.core.network.dto.MatchResultRequest
import com.meydan.app.core.network.dto.RegisterTeamRequest
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

    /** Creates a tournament (caller becomes creator); returns its detail. */
    suspend fun createTournament(
        req: CreateTournamentRequest,
    ): ApiResult<TournamentDetailDto> = apiCall { api.createTournament(req) }

    /** Creator only. Soft-cancels and returns the updated detail. */
    suspend fun cancelTournament(id: String): ApiResult<TournamentDetailDto> =
        apiCall { api.cancelTournament(id) }

    /** All three writes return the updated detail (teams, standings, matches). */
    suspend fun registerTeam(id: String, teamId: String): ApiResult<TournamentDetailDto> =
        apiCall { api.registerTeam(id, RegisterTeamRequest(teamId)) }

    suspend fun unregisterTeam(id: String, teamId: String): ApiResult<TournamentDetailDto> =
        apiCall { api.unregisterTeam(id, teamId) }

    suspend fun recordMatch(
        id: String,
        req: MatchResultRequest,
    ): ApiResult<TournamentDetailDto> = apiCall { api.recordMatch(id, req) }

    suspend fun clearCache() = tournamentsCache.clear()
}
