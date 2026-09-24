package com.meydan.app.feature.teams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.isStale
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
        /**
         * When the data on screen was last saved, if it came from the cache.
         * Read by the offline banner so it can say how old "what was saved" is;
         * a successful refresh clears it, because what is on screen is then
         * live.
         */
        val cachedAt: Long? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    /** When the list last came back from the network. See [isStale]. */
    private var lastLoadedAt: Long? = null

    init {
        viewModelScope.launch {
            teamsRepository.cached()?.let { c ->
                _state.update {
                    it.copy(
                        mine = c.value.mine,
                        others = c.value.others,
                        loading = false,
                        cachedAt = c.savedAt,
                    )
                }
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
        // Skipped right after the init load — the screen's enter effect and the
        // ViewModel's own init were both fetching, so every tab entry cost two
        // identical requests.
        if (!isStale(System.currentTimeMillis(), lastLoadedAt)) return
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        lastLoadedAt = System.currentTimeMillis()
        when (val result = teamsRepository.refresh()) {
            is ApiResult.Success -> _state.update {
                it.copy(
                    mine = result.data.mine,
                    others = result.data.others,
                    loading = false,
                    refreshing = false,
                    offline = false, cachedAt = null,
                )
            }
            is ApiResult.Failure, ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, offline = true)
            }
        }
    }
}
