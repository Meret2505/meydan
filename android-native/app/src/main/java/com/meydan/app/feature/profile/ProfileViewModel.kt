package com.meydan.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.UserDto
import com.meydan.app.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the profile tab from the cached user first (instant, offline) then a
 * fresh /me. Stats (attendance, games played) are not in the /me contract yet,
 * so this shows identity + settings only until a stats endpoint exists.
 */
class ProfileViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val user: UserDto? = null,
        val loggedOut: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.cachedUser()?.let { u -> _state.update { it.copy(user = u) } }
            (authRepository.getMe() as? ApiResult.Success)?.let { r ->
                _state.update { it.copy(user = r.data.user) }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _state.update { it.copy(loggedOut = true) }
        }
    }
}
