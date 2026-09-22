package com.meydan.app.feature.gamedetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.RecordResultRequest
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
        /**
         * The write-up sheet, open only for the organizer of a played game.
         * Null when closed; recording is optional, so nothing forces it open.
         */
        val resultDraft: ResultDraft? = null,
        val loadError: Boolean = false,
        val actionErrorCode: String? = null,
        /** Cancelling is destructive and irreversible, so it is confirmed first. */
        val confirmingCancel: Boolean = false,
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

    fun askCancel() {
        val game = _state.value.game ?: return
        if (!game.isOrganizer || game.status == "CANCELLED" || game.status == "COMPLETED") return
        _state.update { it.copy(confirmingCancel = true) }
    }

    fun dismissCancel() = _state.update { it.copy(confirmingCancel = false) }

    /**
     * Cancels the game. Like join/leave, the server returns the updated detail,
     * so the response replaces state and the screen re-renders as CANCELLED.
     */
    fun confirmCancel() {
        val game = _state.value.game ?: return
        if (_state.value.acting || !game.isOrganizer) return
        _state.update { it.copy(acting = true, confirmingCancel = false, actionErrorCode = null) }
        viewModelScope.launch {
            when (val result = gamesRepository.cancelGame(gameId)) {
                is ApiResult.Success ->
                    _state.update { it.copy(game = result.data, acting = false) }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    /**
     * Opens the write-up sheet, pre-ticking the roster. The organizer arrives
     * here from the RESULT_NEEDED notification the hourly job sends once the
     * game is closed — before that there was no way to record anything from
     * the app at all, so every reliability rating sat at zero.
     */
    fun openResult() {
        val game = _state.value.game ?: return
        if (!game.isOrganizer || !game.isPast) return
        _state.update {
            it.copy(
                // Prefilled from whatever is already recorded, so reopening the
                // sheet to fix one name does not reset the rest. A player with
                // no verdict yet counts as present — confirming is far more
                // common than correcting.
                resultDraft = ResultDraft(
                    attended = game.participants.associate { p -> p.id to (p.attended ?: true) },
                    home = game.scoreHome?.toString() ?: "",
                    away = game.scoreAway?.toString() ?: "",
                ),
                actionErrorCode = null,
            )
        }
    }

    fun dismissResult() = _state.update { it.copy(resultDraft = null) }

    fun toggleAttendance(userId: String) = _state.update {
        it.copy(resultDraft = it.resultDraft?.toggle(userId))
    }

    fun setScores(home: String, away: String) = _state.update {
        it.copy(resultDraft = it.resultDraft?.withScores(home, away))
    }

    fun submitResult() {
        val draft = _state.value.resultDraft ?: return
        val game = _state.value.game ?: return
        if (_state.value.acting || !draft.canSubmit) return
        _state.update { it.copy(acting = true, actionErrorCode = null) }
        viewModelScope.launch {
            val request = RecordResultRequest(
                scoreHome = draft.homeScore,
                scoreAway = draft.awayScore,
                attended = draft.attended,
            )
            when (val result = gamesRepository.recordResult(game.id, request)) {
                is ApiResult.Success ->
                    _state.update {
                        it.copy(game = result.data, acting = false, resultDraft = null)
                    }
                is ApiResult.Failure ->
                    _state.update { it.copy(acting = false, actionErrorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(acting = false, actionErrorCode = "network") }
            }
        }
    }

    fun consumeActionError() = _state.update { it.copy(actionErrorCode = null) }
}
