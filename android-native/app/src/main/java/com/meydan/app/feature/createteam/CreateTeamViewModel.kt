package com.meydan.app.feature.createteam

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.SubmitKey
import com.meydan.app.core.network.dto.CreateTeamRequest
import com.meydan.app.data.TeamsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the create-team form. Mirrors the web team form: a name, an optional
 * district, and one of five preset colours. The creator becomes captain.
 */
class CreateTeamViewModel(
    private val teamsRepository: TeamsRepository,
) : ViewModel() {

    companion object {
        /** Must stay in step with TEAM_COLORS in lib/services/teams.ts. */
        val COLORS = listOf("green", "blue", "amber", "red", "purple")

        /** The web form's floor — a one-character team name is a typo. */
        const val MIN_NAME_LENGTH = 2
    }

    data class UiState(
        val name: String = "",
        val district: String? = null,
        val color: String = "green",
        val submitting: Boolean = false,
        val errorCode: String? = null,
        val createdTeamId: String? = null,
        /**
         * Whether the user has touched a control. Only the setters below set
         * it, never a seeding path, so a form that filled *itself* in is never
         * mistaken for typed input. Re-picking a value that was already
         * selected counts as a touch — that costs one extra confirmation tap
         * and buys a rule with no exceptions to get wrong.
         */
        val edited: Boolean = false,
    ) {
        val canSubmit: Boolean
            get() = !submitting && name.trim().length >= MIN_NAME_LENGTH

        /** See rememberExitGuard: Back must ask before discarding this. */
        val hasUnsavedInput: Boolean get() = edited && createdTeamId == null
    }

    // One key per submit, reused by every retry of it: a retry after a lost
    // response has to be recognised as the same request, not a new one.
    private val submitKey = SubmitKey()

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setName(v: String) =
        _state.update { it.copy(name = v.take(40), errorCode = null, edited = true) }

    fun setDistrict(v: String) = _state.update { it.copy(district = v, edited = true) }

    fun setColor(v: String) = _state.update { it.copy(color = v, edited = true) }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.update { it.copy(submitting = true, errorCode = null) }
        viewModelScope.launch {
            val req = CreateTeamRequest(
                name = s.name.trim(),
                district = s.district,
                color = s.color,
            )
            when (val result = teamsRepository.createTeam(req, submitKey.forAttempt())) {
                is ApiResult.Success ->
                    _state.update { it.copy(submitting = false, createdTeamId = result.data.id) }
                is ApiResult.Failure ->
                    _state.update { it.copy(submitting = false, errorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(submitting = false, errorCode = "network") }
            }
        }
    }
}
