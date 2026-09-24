package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.Cached
import com.meydan.app.core.datastore.JsonCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.CreateTournamentRequest
import com.meydan.app.core.network.dto.MatchResultRequest
import com.meydan.app.core.network.dto.RegisterTeamRequest
import com.meydan.app.core.network.dto.TournamentCardDto
import com.meydan.app.core.network.dto.TournamentDetailDto

/** Tournaments tab data with the offline-first read path. */
class TournamentsRepository(
    private val api: MeydanApi,
    private val tournamentsCache: JsonCache<List<TournamentCardDto>>,
) {
    /** The stored list and when it was stored; null if never. */
    suspend fun cached(): Cached<List<TournamentCardDto>>? = tournamentsCache.load()

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

    /**
     * Creates a tournament (caller becomes creator); returns its detail.
     * [idempotencyKey] makes a retry of a lost response replay rather than
     * create a second tournament — see SubmitKey.
     */
    suspend fun createTournament(
        req: CreateTournamentRequest,
        idempotencyKey: String,
    ): ApiResult<TournamentDetailDto> =
        apiCall { api.createTournament(idempotencyKey, req) }

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
