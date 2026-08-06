package com.meydan.app.feature.teamdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.TeamDetailDto
import com.meydan.app.core.network.dto.TeamMemberDto
import com.meydan.app.data.TeamsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Team detail with join/leave. Like the game detail, both writes return the
 * updated team (roster, member count and the viewer's membership flags), so the
 * response replaces state directly — no refetch, no stale roster.
 *
 * A captain has no leave action: there is no captain hand-off in the product,
 * so leaving would strand the team. The server enforces this too.
 */
class TeamDetailViewModel(
    private val teamsRepository: TeamsRepository,
    private val teamId: String,
) : ViewModel() {

    data class UiState(
        val team: TeamDetailDto? = null,
        val loading: Boolean = true,
        val acting: Boolean = false,
        val loadError: Boolean = false,
        val actionErrorCode: String? = null,
        /** Both captain actions are destructive, so they are confirmed first. */
        val confirmingDisband: Boolean = false,
        /** The member the captain is about to remove, if any. */
        val confirmingRemove: TeamMemberDto? = null,
        /** Set once the team is gone; the screen leaves. */
        val disbanded: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            when (val result = teamsRepository.detail(teamId)) {
                is ApiResult.Success ->
                    _state.update { it.copy(team = result.data, loading = false, loadError = false) }
                is ApiResult.Failure, ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, loadError = it.team == null) }
            }
        }
    }

    fun retry() {
        _state.update { it.copy(loading = true, loadError = false) }
        load()
    }

    fun toggleMembership() {
        val team = _state.value.team ?: return
        if (_state.value.acting || team.isCaptain) return
        _state.update { it.copy(acting = true, actionErrorCode = null) }
        viewModelScope.launch {
            val result =
                if (team.isMember) teamsRepository.leaveTeam(teamId)
                else teamsRepository.joinTeam(teamId)
            when (result) {
                is ApiResult.Success ->
                    _state.update { it.copy(team = result.data, acting = false) }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    // --- Captain actions ---

    fun askRemove(member: TeamMemberDto) {
        val team = _state.value.team ?: return
        // The captain cannot remove themselves — that would strand the team.
        if (!team.isCaptain || member.isCaptain) return
        _state.update { it.copy(confirmingRemove = member) }
    }

    fun dismissRemove() = _state.update { it.copy(confirmingRemove = null) }

    fun confirmRemove() {
        val member = _state.value.confirmingRemove ?: return
        if (_state.value.acting) return
        _state.update { it.copy(acting = true, confirmingRemove = null, actionErrorCode = null) }
        viewModelScope.launch {
            when (val result = teamsRepository.removeMember(teamId, member.id)) {
                is ApiResult.Success ->
                    _state.update { it.copy(team = result.data, acting = false) }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    fun askDisband() {
        val team = _state.value.team ?: return
        if (!team.isCaptain) return
        _state.update { it.copy(confirmingDisband = true) }
    }

    fun dismissDisband() = _state.update { it.copy(confirmingDisband = false) }

    fun confirmDisband() {
        if (_state.value.acting) return
        _state.update { it.copy(acting = true, confirmingDisband = false, actionErrorCode = null) }
        viewModelScope.launch {
            when (val result = teamsRepository.disbandTeam(teamId)) {
                is ApiResult.Success ->
                    _state.update { it.copy(acting = false, disbanded = true) }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    fun consumeActionError() = _state.update { it.copy(actionErrorCode = null) }
}
