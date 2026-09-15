package com.meydan.app.feature.games

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.network.dto.GameCardDto
import com.meydan.app.data.GamesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Feed state, mirroring the web GamesBoard: two tabs over one fetched data
 * set, three toggleable filter chips applied in memory, switching tabs clears
 * the chip. On top of that, the offline-first load order: cached feed first,
 * network refresh second; a failed refresh keeps the cache and raises the
 * offline flag instead of blanking the screen.
 */
class GamesViewModel(
    private val gamesRepository: GamesRepository,
) : ViewModel() {

    enum class Tab { OPEN, MINE }
    enum class Chip { TODAY, FIVE, GOALIE }

    data class UiState(
        val open: List<GameCardDto> = emptyList(),
        val mine: List<GameCardDto> = emptyList(),
        val tab: Tab = Tab.OPEN,
        val chip: Chip? = null,
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
        val unread: Int = 0,
    ) {
        val visible: List<GameCardDto>
            get() = applyChip(if (tab == Tab.OPEN) open else mine, chip)
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            // Cache first: the feed appears instantly (or the skeleton stays
            // briefly on true first run), then the network result replaces it.
            gamesRepository.cachedFeed()?.let { cached ->
                _state.update {
                    it.copy(open = cached.open, mine = cached.mine, loading = false)
                }
            }
            refresh(initial = true)
        }
        viewModelScope.launch { refreshUnread() }
    }

    fun selectTab(tab: Tab) {
        // Same as the web: switching tabs clears the active chip.
        _state.update { it.copy(tab = tab, chip = null) }
    }

    fun toggleChip(chip: Chip) {
        _state.update { it.copy(chip = if (it.chip == chip) null else chip) }
    }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { refresh(initial = false) }
    }

    /**
     * Silent re-fetch for when the feed is re-shown — e.g. returning after
     * creating a game. The feed VM is scoped to the home back-stack entry and
     * survives the trip to the create screen, so without this a freshly created
     * game never lands in "Mine" until a manual pull. Unlike [pullRefresh] it
     * leaves the pull spinner alone.
     */
    fun refreshOnResume() {
        viewModelScope.launch { refresh(initial = false) }
        // The bell badge was only ever fetched once, at VM init — a notification
        // that arrived later (e.g. a field submission getting approved) never
        // showed up on the badge until the process restarted. Re-fetch it every
        // time the feed resumes, same as the game list.
        viewModelScope.launch { refreshUnread() }
    }

    private suspend fun refreshUnread() {
        (gamesRepository.unreadCount() as? ApiResult.Success)?.let { r ->
            _state.update { it.copy(unread = r.data) }
        }
    }

    private suspend fun refresh(initial: Boolean) {
        when (val result = gamesRepository.refresh()) {
            is ApiResult.Success -> _state.update {
                it.copy(
                    open = result.data.open,
                    mine = result.data.mine,
                    loading = false,
                    refreshing = false,
                    offline = false,
                )
            }
            // Server errors and dead connections read the same to the feed:
            // keep showing the cache, flag it as possibly stale.
            is ApiResult.Failure, ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, offline = true)
            }
        }
    }

    companion object {
        /** The chip filters, ported verbatim from GamesBoard.applyChip. */
        fun applyChip(list: List<GameCardDto>, chip: Chip?): List<GameCardDto> =
            when (chip) {
                null -> list
                Chip.FIVE -> list.filter { it.totalSpots == 10 }
                Chip.GOALIE -> list.filter { it.neededPositions.contains("GOALKEEPER") }
                Chip.TODAY -> list.filter { card ->
                    GameTime.parse(card.scheduledAt)?.let { GameTime.isToday(it) } == true
                }
            }
    }
}
