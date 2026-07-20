package com.meydan.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.LocaleMapper
import com.meydan.app.core.common.normalizePhone
import com.meydan.app.core.network.dto.SessionDto
import com.meydan.app.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Drives both login screens (landing and phone form).
 *
 * Error codes are kept as the server's machine strings ("wrong_password",
 * "rate_limited", …); the composable maps them to localized resources — the
 * same split the web makes between the action and the form.
 */
class LoginViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val phone: String = "",
        val password: String = "",
        val loading: Boolean = false,
        val errorCode: String? = null,
    )

    /** Where to go after a successful sign-in. */
    sealed interface Destination {
        data object Onboarding : Destination
        data object Home : Destination
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    private val _navigateTo = MutableStateFlow<Destination?>(null)
    val navigateTo: StateFlow<Destination?> = _navigateTo.asStateFlow()

    fun onPhoneChange(raw: String) {
        // Digits only, capped at 8 — the field renders its own "65 12 34 56"
        // grouping, mirroring formatPhoneDisplay on the web.
        val digits = raw.filter { it.isDigit() }.take(8)
        _state.update { it.copy(phone = digits, errorCode = null) }
    }

    fun onPasswordChange(value: String) {
        _state.update { it.copy(password = value, errorCode = null) }
    }

    fun submitPhone(androidLanguageTag: String) {
        val s = _state.value
        val normalized = normalizePhone(s.phone)
        // Same client-side gate as the web form: both fields, password >= 6.
        if (normalized == null || s.password.length < 6) {
            _state.update { it.copy(errorCode = "invalid_input") }
            return
        }
        _state.update { it.copy(loading = true, errorCode = null) }
        viewModelScope.launch {
            handleAuthResult(
                authRepository.phoneLogin(
                    phone = normalized,
                    password = s.password,
                    apiLocale = LocaleMapper.toApiLocale(androidLanguageTag),
                ),
            )
        }
    }

    fun submitGoogleToken(idToken: String) {
        _state.update { it.copy(loading = true, errorCode = null) }
        viewModelScope.launch {
            handleAuthResult(authRepository.googleLogin(idToken))
        }
    }

    fun onGoogleFailed() {
        _state.update { it.copy(loading = false, errorCode = "auth_failed") }
    }

    fun onGoogleCancelled() {
        _state.update { it.copy(loading = false) }
    }

    fun consumeNavigation() {
        _navigateTo.value = null
    }

    private fun handleAuthResult(outcome: ApiResult<SessionDto>) {
        when (outcome) {
            is ApiResult.Success -> {
                _state.update { it.copy(loading = false) }
                _navigateTo.value =
                    if (outcome.data.user.onboardingComplete) Destination.Home
                    else Destination.Onboarding
            }
            is ApiResult.Failure ->
                _state.update { it.copy(loading = false, errorCode = outcome.code) }
            ApiResult.NetworkError ->
                _state.update { it.copy(loading = false, errorCode = "network") }
        }
    }
}
