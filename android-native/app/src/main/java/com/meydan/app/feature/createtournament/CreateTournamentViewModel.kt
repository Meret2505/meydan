package com.meydan.app.feature.createtournament

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.SubmitKey
import com.meydan.app.core.network.dto.CreateTournamentRequest
import com.meydan.app.data.TournamentsRepository
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the create-tournament form: name, start date, optional end date and
 * description. The creator becomes the only person who can record results.
 */
class CreateTournamentViewModel(
    private val tournamentsRepository: TournamentsRepository,
    today: LocalDate,
) : ViewModel() {

    companion object {
        /** Matches the service floor; a one-character name is a typo. */
        const val MIN_NAME_LENGTH = 2
    }

    data class UiState(
        val name: String = "",
        val startDate: LocalDate,
        val endDate: LocalDate? = null,
        val description: String = "",
        val submitting: Boolean = false,
        val errorCode: String? = null,
        val createdId: String? = null,
        /** The user touched a control; see CreateTeamViewModel.UiState.edited. */
        val edited: Boolean = false,
    ) {
        val canSubmit: Boolean
            get() = !submitting &&
                name.trim().length >= MIN_NAME_LENGTH &&
                // The server rejects this too; blocking it here avoids a
                // pointless round-trip and a confusing error.
                (endDate == null || !endDate.isBefore(startDate))

        /** See rememberExitGuard: Back must ask before discarding this. */
        val hasUnsavedInput: Boolean get() = edited && createdId == null
    }

    // One key per submit, reused by every retry of it: a retry after a lost
    // response has to be recognised as the same request, not a new one.
    private val submitKey = SubmitKey()

    // Default to a week out, like a real fixture list rather than "today".
    private val _state = MutableStateFlow(UiState(startDate = today.plusWeeks(1)))
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setName(v: String) =
        _state.update { it.copy(name = v.take(60), errorCode = null, edited = true) }

    fun setStart(d: LocalDate) =
        _state.update { it.copy(startDate = d, errorCode = null, edited = true) }

    fun setEnd(d: LocalDate?) =
        _state.update { it.copy(endDate = d, errorCode = null, edited = true) }

    fun setDescription(v: String) = _state.update { it.copy(description = v, edited = true) }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.update { it.copy(submitting = true, errorCode = null) }
        viewModelScope.launch {
            val req = CreateTournamentRequest(
                name = s.name.trim(),
                startDate = s.startDate.toIso(),
                endDate = s.endDate?.toIso(),
                description = s.description.trim().ifEmpty { null },
            )
            when (val result = tournamentsRepository.createTournament(req, submitKey.forAttempt())) {
                is ApiResult.Success ->
                    _state.update { it.copy(submitting = false, createdId = result.data.id) }
                is ApiResult.Failure ->
                    _state.update { it.copy(submitting = false, errorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(submitting = false, errorCode = "network") }
            }
        }
    }
}

/** Start of the chosen day in the device's zone, as a UTC instant. */
private fun LocalDate.toIso(): String =
    atStartOfDay(ZoneId.systemDefault()).toInstant().toString()
