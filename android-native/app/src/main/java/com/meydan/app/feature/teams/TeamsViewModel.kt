package com.meydan.app.feature.teams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.TeamCardDto
import com.meydan.app.data.TeamsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Teams tab: offline-first load of the user's teams + the city ranking. */
class TeamsViewModel(
    private val teamsRepository: TeamsRepository,
) : ViewModel() {

    data class UiState(
        val mine: List<TeamCardDto> = emptyList(),
        val others: List<TeamCardDto> = emptyList(),
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            teamsRepository.cached()?.let { c ->
                _state.update { it.copy(mine = c.mine, others = c.others, loading = false) }
            }
            load()
        }
    }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { load() }
    }

    /**
     * Silent re-fetch when the tab is shown again. This ViewModel is scoped to
     * the home back-stack entry, so `init` does not re-run after a trip to a
     * team detail or the create form — without this the list would still show a
     * team that was just disbanded, or miss one just created.
     */
    fun refreshOnEnter() {
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        when (val result = teamsRepository.refresh()) {
            is ApiResult.Success -> _state.update {
                it.copy(
                    mine = result.data.mine,
                    others = result.data.others,
                    loading = false,
                    refreshing = false,
                    offline = false,
                )
            }
            is ApiResult.Failure, ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, offline = true)
            }
        }
    }
}
