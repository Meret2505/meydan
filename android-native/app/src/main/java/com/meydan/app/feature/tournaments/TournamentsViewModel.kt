package com.meydan.app.feature.tournaments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.isStale
import com.meydan.app.core.network.dto.TournamentCardDto
import com.meydan.app.data.TournamentsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Tournaments tab: offline-first load, then three tabs filtered in memory by
 * the server-computed status — matching the web tournaments page.
 */
class TournamentsViewModel(
    private val tournamentsRepository: TournamentsRepository,
) : ViewModel() {

    enum class Tab { UPCOMING, ONGOING, ENDED }

    data class UiState(
        val tournaments: List<TournamentCardDto> = emptyList(),
        val tab: Tab = Tab.UPCOMING,
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
    ) {
        val visible: List<TournamentCardDto>
            get() = tournaments.filter { inTab(it.status, tab) }
    }

    /** When the list last came back from the network. See [isStale]. */
    private var lastLoadedAt: Long? = null

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            tournamentsRepository.cached()?.let { c ->
                _state.update {
                    it.copy(tournaments = c.value, loading = false, cachedAt = c.savedAt)
                }
            }
            load()
        }
    }

    fun selectTab(tab: Tab) = _state.update { it.copy(tab = tab) }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { load() }
    }

    /**
     * Re-fetch on entering the tab. This was the only list tab without it, and
     * because creating a tournament lands on the new tournament's detail
     * screen, pressing Back returned to a list that did not contain the thing
     * the user had just made — until they pulled to refresh. Gated on
     * freshness like the others, so entering the tab twice is one request.
     */
    fun refreshOnEnter() {
        if (!isStale(System.currentTimeMillis(), lastLoadedAt)) return
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        lastLoadedAt = System.currentTimeMillis()
        when (val result = tournamentsRepository.refresh()) {
            is ApiResult.Success -> _state.update {
                it.copy(tournaments = result.data, loading = false, refreshing = false, offline = false, cachedAt = null)
            }
            is ApiResult.Failure, ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, offline = true)
            }
        }
    }

    companion object {
        /**
         * Which tab a status belongs to. Cancelled tournaments live under
         * "ended" alongside genuinely finished ones, matching the web filter.
         */
        fun inTab(status: String, tab: Tab): Boolean = when (tab) {
            Tab.UPCOMING -> status == "upcoming"
            Tab.ONGOING -> status == "ongoing"
            Tab.ENDED -> status == "ended" || status == "cancelled"
        }
    }
}
