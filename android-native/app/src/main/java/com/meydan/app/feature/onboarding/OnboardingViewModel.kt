package com.meydan.app.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.LocaleMapper
import com.meydan.app.core.common.Position
import com.meydan.app.core.common.normalizePhone
import com.meydan.app.core.network.dto.ProfilePatch
import com.meydan.app.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * The five onboarding steps as one state machine: name, phone, position,
 * district, age. Mirrors the web wizard — each step PATCHes its single field
 * and only advances when the server accepted it, so a killed app resumes with
 * everything before the current step already saved.
 *
 * Age is optional: "finish" sends it, "skip" just finishes. Completion itself
 * is flipped server-side by the phone step (onboardingComplete = has phone);
 * the repository swaps in the re-minted access token transparently.
 */
class OnboardingViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    /** Age bucket choices, identical to the web's RANGES. */
    data class AgeRange(val label: String, val mid: Int)

    companion object {
        const val STEP_COUNT = 5
        val AGE_RANGES = listOf(
            AgeRange("18–24", 21),
            AgeRange("25–34", 29),
            AgeRange("35+", 37),
        )
    }

    data class UiState(
        val step: Int = 1,
        val name: String = "",
        val phoneDigits: String = "",
        val position: Position? = null,
        val district: String? = null,
        val ageMid: Int? = null,
        val loading: Boolean = false,
        val errorCode: String? = null,
        val finished: Boolean = false,
    ) {
        val canProceed: Boolean
            get() = when (step) {
                1 -> name.trim().isNotEmpty()
                2 -> phoneDigits.length == 8
                3 -> position != null
                4 -> district != null
                5 -> ageMid != null
                else -> false
            }
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        // Google gives most users a name already — prefill so step 1 is just
        // "next" for them, the same head start the web wizard gets from the
        // session.
        viewModelScope.launch {
            authRepository.cachedUser()?.let { user ->
                _state.update {
                    it.copy(
                        name = if (it.name.isEmpty()) user.name else it.name,
                        position = it.position
                            ?: user.position?.let { p -> runCatching { Position.valueOf(p) }.getOrNull() },
                        district = it.district ?: user.district,
                    )
                }
            }
        }
    }

    fun onNameChange(value: String) =
        _state.update { it.copy(name = value, errorCode = null) }

    fun onPhoneChange(digits: String) =
        _state.update { it.copy(phoneDigits = digits, errorCode = null) }

    fun onPositionSelect(value: Position) =
        _state.update { it.copy(position = value, errorCode = null) }

    fun onDistrictSelect(value: String) =
        _state.update { it.copy(district = value, errorCode = null) }

    fun onAgeSelect(mid: Int) =
        _state.update { it.copy(ageMid = mid, errorCode = null) }

    fun back() {
        _state.update {
            if (it.step > 1) it.copy(step = it.step - 1, errorCode = null) else it
        }
    }

    /**
     * Saves the current step's field; advances (or finishes) on success. The
     * final (age) step also persists the chosen language, like the web's
     * saveAge, so server-sent push text uses it. [androidLanguageTag] is the
     * current app locale tag (ru/tk), mapped to the API code here.
     */
    fun next(androidLanguageTag: String) {
        val s = _state.value
        if (s.loading || !s.canProceed) return

        val patch = when (s.step) {
            1 -> ProfilePatch(name = s.name.trim())
            2 -> {
                val normalized = normalizePhone(s.phoneDigits)
                if (normalized == null) {
                    _state.update { it.copy(errorCode = "invalid_input") }
                    return
                }
                ProfilePatch(phone = normalized)
            }
            3 -> ProfilePatch(position = s.position!!.name)
            4 -> ProfilePatch(district = s.district)
            5 -> ProfilePatch(
                age = s.ageMid.toString(),
                locale = LocaleMapper.toApiLocale(androidLanguageTag),
            )
            else -> return
        }
        submit(patch)
    }

    /**
     * The age step's skip: onboarding is already complete, but — like the web's
     * skipAge — it must still persist the language choice for push text. Fire
     * and forget so skip stays instant.
     */
    fun skipAge(androidLanguageTag: String) {
        if (_state.value.step != STEP_COUNT || _state.value.loading) return
        val apiLocale = LocaleMapper.toApiLocale(androidLanguageTag)
        viewModelScope.launch {
            runCatching { authRepository.updateProfile(ProfilePatch(locale = apiLocale)) }
        }
        _state.update { it.copy(finished = true) }
    }

    private fun submit(patch: ProfilePatch) {
        _state.update { it.copy(loading = true, errorCode = null) }
        viewModelScope.launch {
            when (val result = authRepository.updateProfile(patch)) {
                is ApiResult.Success -> _state.update {
                    if (it.step == STEP_COUNT) it.copy(loading = false, finished = true)
                    else it.copy(loading = false, step = it.step + 1)
                }
                is ApiResult.Failure ->
                    _state.update { it.copy(loading = false, errorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, errorCode = "network") }
            }
        }
    }
}
