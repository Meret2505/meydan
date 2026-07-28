package com.meydan.app.feature.gamedetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.data.GamesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Game detail with join/leave. Join and leave return the updated detail (the
 * server recomputes the roster, counts, and the joined/full flags), so the
 * response replaces state directly — no separate refetch and no window where
 * the UI shows a stale count.
 */
class GameDetailViewModel(
    private val gamesRepository: GamesRepository,
    private val gameId: String,
) : ViewModel() {

    data class UiState(
        val game: GameDetailDto? = null,
        val loading: Boolean = true,
        val acting: Boolean = false,
        val loadError: Boolean = false,
        val actionErrorCode: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            when (val result = gamesRepository.gameDetail(gameId)) {
                is ApiResult.Success ->
                    _state.update { it.copy(game = result.data, loading = false, loadError = false) }
                is ApiResult.Failure, ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, loadError = it.game == null) }
            }
        }
    }

    fun retry() {
        _state.update { it.copy(loading = true, loadError = false) }
        load()
    }

    fun toggleJoin() {
        val game = _state.value.game ?: return
        if (_state.value.acting || game.isOrganizer || game.isPast) return
        _state.update { it.copy(acting = true, actionErrorCode = null) }
        viewModelScope.launch {
            val result =
                if (game.joined) gamesRepository.leaveGame(gameId)
                else gamesRepository.joinGame(gameId)
            when (result) {
                is ApiResult.Success ->
                    _state.update { it.copy(game = result.data, acting = false) }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    fun consumeActionError() = _state.update { it.copy(actionErrorCode = null) }
}
