package com.meydan.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.ProfileStatsDto
import com.meydan.app.core.network.dto.UserDto
import com.meydan.app.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the profile tab from the cached user first (instant, offline) then a
 * fresh /me, with the attendance block loaded separately so identity renders
 * without waiting on the heavier aggregate — mirroring how the web page
 * suspends its stats section.
 */
class ProfileViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    data class UiState(
        val user: UserDto? = null,
        val stats: ProfileStatsDto? = null,
        val statsLoading: Boolean = true,
        val uploadingAvatar: Boolean = false,
        /** Set when an avatar write fails — too large, rate limited, offline. */
        val avatarErrorCode: String? = null,
        /** True while the change/remove sheet is open (only with an avatar set). */
        val avatarMenuOpen: Boolean = false,
        val loggedOut: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        // Observe the cache so edits made on the profile-edit screen (which
        // writes the cache) are reflected the moment we return here.
        viewModelScope.launch {
            authRepository.cachedUserFlow.collect { u ->
                if (u != null) _state.update { it.copy(user = u) }
            }
        }
        // Refresh from the server; getMe writes the cache, so the collector above
        // picks up the result.
        viewModelScope.launch { authRepository.getMe() }
        loadStats()
    }

    private fun loadStats() {
        viewModelScope.launch {
            val result = authRepository.myStats()
            _state.update {
                it.copy(
                    stats = (result as? ApiResult.Success)?.data ?: it.stats,
                    statsLoading = false,
                )
            }
        }
    }

    /**
     * Uploads a newly picked avatar. The caller reads the bytes from the picked
     * content URI — the ViewModel deliberately knows nothing about ContentResolver.
     */
    fun uploadAvatar(bytes: ByteArray, mime: String, filename: String) {
        if (_state.value.uploadingAvatar) return
        _state.update { it.copy(uploadingAvatar = true, avatarErrorCode = null) }
        viewModelScope.launch {
            // The repository refreshes the cached user on success, so the
            // collector above swaps in the new avatar; only failure needs
            // handling here, and it used to be dropped silently.
            applyAvatarResult(authRepository.uploadAvatar(bytes, mime, filename))
        }
    }

    fun openAvatarMenu() = _state.update { it.copy(avatarMenuOpen = true) }

    fun dismissAvatarMenu() = _state.update { it.copy(avatarMenuOpen = false) }

    fun removeAvatar() {
        if (_state.value.uploadingAvatar) return
        _state.update {
            it.copy(uploadingAvatar = true, avatarMenuOpen = false, avatarErrorCode = null)
        }
        viewModelScope.launch { applyAvatarResult(authRepository.removeAvatar()) }
    }

    private fun applyAvatarResult(result: ApiResult<*>) {
        _state.update {
            it.copy(
                uploadingAvatar = false,
                avatarErrorCode = when (result) {
                    is ApiResult.Success -> null
                    is ApiResult.Failure -> result.code
                    ApiResult.NetworkError -> "network"
                },
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _state.update { it.copy(loggedOut = true) }
        }
    }
}
