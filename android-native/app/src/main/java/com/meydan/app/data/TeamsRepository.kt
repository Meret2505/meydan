package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.Cached
import com.meydan.app.core.datastore.JsonCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.CreateTeamRequest
import com.meydan.app.core.network.dto.DisbandedDto
import com.meydan.app.core.network.dto.TeamDetailDto
import com.meydan.app.core.network.dto.TeamsResponse

/** Teams tab data with the offline-first read path shared by games/fields. */
class TeamsRepository(
    private val api: MeydanApi,
    private val teamsCache: JsonCache<TeamsResponse>,
) {
    /** The stored response and when it was stored; null if never. */
    suspend fun cached(): Cached<TeamsResponse>? = teamsCache.load()

    suspend fun refresh(): ApiResult<TeamsResponse> {
        val result = apiCall { api.getTeams() }
        if (result is ApiResult.Success) teamsCache.save(result.data)
        return result
    }

    suspend fun detail(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.getTeamDetail(id) }

    /**
     * Creates a team (caller becomes captain); returns the new team's detail.
     * [idempotencyKey] makes a retry of a lost response replay rather than
     * create a second team — see SubmitKey.
     */
    suspend fun createTeam(
        req: CreateTeamRequest,
        idempotencyKey: String,
    ): ApiResult<TeamDetailDto> = apiCall { api.createTeam(idempotencyKey, req) }

    /** Join returns the updated detail (roster, count, membership flags). */
    suspend fun joinTeam(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.joinTeam(id) }

    /** Leave returns the updated detail. Captains cannot leave (403). */
    suspend fun leaveTeam(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.leaveTeam(id) }

    /** Captain removes a player; returns the updated detail. */
    suspend fun removeMember(id: String, userId: String): ApiResult<TeamDetailDto> =
        apiCall { api.removeMember(id, userId) }

    /** Captain disbands the team. Refused while it still has games (409). */
    suspend fun disbandTeam(id: String): ApiResult<DisbandedDto> =
        apiCall { api.disbandTeam(id) }

    suspend fun clearCache() = teamsCache.clear()
}
