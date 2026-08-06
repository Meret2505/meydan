package com.meydan.app.feature.tournamentdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.MatchResultRequest
import com.meydan.app.core.network.dto.TournamentDetailDto
import com.meydan.app.core.network.dto.ViewerTeamDto
import com.meydan.app.data.TournamentsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Tournament detail with the two write flows: a captain entering or
 * withdrawing their own team, and the creator recording a result.
 *
 * Every write returns the updated detail (teams, standings and matches all
 * change together), so responses replace state directly rather than refetching.
 */
class TournamentDetailViewModel(
    private val tournamentsRepository: TournamentsRepository,
    private val tournamentId: String,
) : ViewModel() {

    data class UiState(
        val tournament: TournamentDetailDto? = null,
        val loading: Boolean = true,
        val acting: Boolean = false,
        val loadError: Boolean = false,
        val actionErrorCode: String? = null,
        /** Non-null while the record-result sheet is open. */
        val recording: RecordForm? = null,
    )

    /** In-progress result entry. Team ids are picked from the entered teams. */
    data class RecordForm(
        val homeTeamId: String? = null,
        val awayTeamId: String? = null,
        val scoreHome: String = "",
        val scoreAway: String = "",
    ) {
        val canSubmit: Boolean
            get() = homeTeamId != null &&
                awayTeamId != null &&
                homeTeamId != awayTeamId &&
                scoreHome.toIntOrNull() != null &&
                scoreAway.toIntOrNull() != null
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            when (val result = tournamentsRepository.detail(tournamentId)) {
                is ApiResult.Success ->
                    _state.update {
                        it.copy(tournament = result.data, loading = false, loadError = false)
                    }
                is ApiResult.Failure, ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, loadError = it.tournament == null) }
            }
        }
    }

    fun retry() {
        _state.update { it.copy(loading = true, loadError = false) }
        load()
    }

    /** Enters or withdraws one of the viewer's captained teams. */
    fun toggleRegistration(team: ViewerTeamDto) {
        if (_state.value.acting) return
        _state.update { it.copy(acting = true, actionErrorCode = null) }
        viewModelScope.launch {
            val result =
                if (team.registered) tournamentsRepository.unregisterTeam(tournamentId, team.id)
                else tournamentsRepository.registerTeam(tournamentId, team.id)
            applyWrite(result)
        }
    }

    // --- Record result ---

    fun openRecord() {
        val t = _state.value.tournament ?: return
        if (!t.isCreator) return
        _state.update { it.copy(recording = RecordForm(), actionErrorCode = null) }
    }

    fun closeRecord() = _state.update { it.copy(recording = null) }

    fun setHome(id: String) = _state.update {
        it.copy(recording = it.recording?.copy(homeTeamId = id))
    }

    fun setAway(id: String) = _state.update {
        it.copy(recording = it.recording?.copy(awayTeamId = id))
    }

    fun setScoreHome(v: String) = _state.update {
        it.copy(recording = it.recording?.copy(scoreHome = digits(v)))
    }

    fun setScoreAway(v: String) = _state.update {
        it.copy(recording = it.recording?.copy(scoreAway = digits(v)))
    }

    private fun digits(v: String) = v.filter { it.isDigit() }.take(3)

    fun submitRecord() {
        val form = _state.value.recording ?: return
        if (!form.canSubmit || _state.value.acting) return
        _state.update { it.copy(acting = true, recording = null, actionErrorCode = null) }
        viewModelScope.launch {
            val req = MatchResultRequest(
                homeTeamId = form.homeTeamId!!,
                awayTeamId = form.awayTeamId!!,
                scoreHome = form.scoreHome.toInt(),
                scoreAway = form.scoreAway.toInt(),
            )
            applyWrite(tournamentsRepository.recordMatch(tournamentId, req))
        }
    }

    private fun applyWrite(result: ApiResult<TournamentDetailDto>) {
        when (result) {
            is ApiResult.Success ->
                _state.update { it.copy(tournament = result.data, acting = false) }
            is ApiResult.Failure ->
                _state.update { it.copy(acting = false, actionErrorCode = result.code) }
            ApiResult.NetworkError ->
                _state.update { it.copy(acting = false, actionErrorCode = "network") }
        }
    }

    fun consumeActionError() = _state.update { it.copy(actionErrorCode = null) }
}
