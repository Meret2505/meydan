package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.TeamsCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.CreateTeamRequest
import com.meydan.app.core.network.dto.TeamDetailDto
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

    suspend fun detail(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.getTeamDetail(id) }

    /** Creates a team (caller becomes captain); returns the new team's detail. */
    suspend fun createTeam(req: CreateTeamRequest): ApiResult<TeamDetailDto> =
        apiCall { api.createTeam(req) }

    /** Join returns the updated detail (roster, count, membership flags). */
    suspend fun joinTeam(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.joinTeam(id) }

    /** Leave returns the updated detail. Captains cannot leave (403). */
    suspend fun leaveTeam(id: String): ApiResult<TeamDetailDto> =
        apiCall { api.leaveTeam(id) }

    suspend fun clearCache() = teamsCache.clear()
}
