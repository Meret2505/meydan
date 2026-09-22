package com.meydan.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.datastore.SettingsStore
import com.meydan.app.core.datastore.ThemeMode
import com.meydan.app.core.network.dto.ProfileStatsDto
import com.meydan.app.core.network.dto.UserDto
import com.meydan.app.data.AuthRepository
import com.meydan.app.data.FieldSubmissionsRepository
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
    private val settingsStore: SettingsStore,
    private val fieldSubmissionsRepository: FieldSubmissionsRepository,
) : ViewModel() {

    data class UiState(
        val user: UserDto? = null,
        val stats: ProfileStatsDto? = null,
        val statsLoading: Boolean = true,
        /**
         * Set when /me came back empty-handed and there is no cached user to
         * fall back on. Without it the screen drew an empty avatar circle, a
         * blank name and a bare " · —" and looked broken rather than offline.
         */
        val loadFailed: Boolean = false,
        /** Set when the attendance block failed; it used to just not exist. */
        val statsFailed: Boolean = false,
        val uploadingAvatar: Boolean = false,
        /** Set when an avatar write fails — too large, rate limited, offline. */
        val avatarErrorCode: String? = null,
        /** True while the change/remove sheet is open (only with an avatar set). */
        val avatarMenuOpen: Boolean = false,
        /** True while the theme-picker sheet is open. */
        val themeMenuOpen: Boolean = false,
        val themeMode: ThemeMode = ThemeMode.SYSTEM,
        /** True while the language-picker sheet is open. */
        val languageMenuOpen: Boolean = false,
        val loggedOut: Boolean = false,
        /**
         * Logout was the one destructive action in the app that fired on the
         * first tap, one row below "Language" — and getting back in costs an
         * SMS round trip on a bad connection.
         */
        val confirmingLogout: Boolean = false,
        /** Admin-only: PENDING field submissions, shown as a badge on the
         *  moderation row so a new one doesn't sit unnoticed until the admin
         *  happens to open that screen. */
        val pendingModerationCount: Int = 0,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        // Observe the cache so edits made on the profile-edit screen (which
        // writes the cache) are reflected the moment we return here.
        viewModelScope.launch {
            authRepository.cachedUserFlow.collect { u ->
                if (u != null) {
                    _state.update { it.copy(user = u) }
                    if (u.isAdmin) refreshModerationCount()
                }
            }
        }
        viewModelScope.launch {
            settingsStore.themeMode.collect { mode -> _state.update { it.copy(themeMode = mode) } }
        }
        // Refresh from the server; getMe writes the cache, so the collector above
        // picks up the result. A failure only matters when there is nothing
        // cached to show.
        viewModelScope.launch {
            val result = authRepository.getMe()
            if (result !is ApiResult.Success) {
                _state.update { it.copy(loadFailed = it.user == null) }
            }
        }
        loadStats()
    }

    /** Re-checks the queue whenever the tab is resumed, so approving/rejecting
     *  a submission (or a new one arriving) updates the badge without needing
     *  to leave and re-enter the Profile tab. */
    fun refreshOnResume() {
        viewModelScope.launch { refreshModerationCount() }
    }

    private suspend fun refreshModerationCount() {
        if (_state.value.user?.isAdmin != true) return
        (fieldSubmissionsRepository.listPending() as? ApiResult.Success)?.let { r ->
            _state.update { it.copy(pendingModerationCount = r.data.size) }
        }
    }

    fun openThemeMenu() = _state.update { it.copy(themeMenuOpen = true) }

    fun dismissThemeMenu() = _state.update { it.copy(themeMenuOpen = false) }

    fun setThemeMode(mode: ThemeMode) {
        _state.update { it.copy(themeMenuOpen = false) }
        viewModelScope.launch { settingsStore.setThemeMode(mode) }
    }

    fun openLanguageMenu() = _state.update { it.copy(languageMenuOpen = true) }

    fun dismissLanguageMenu() = _state.update { it.copy(languageMenuOpen = false) }

    /** Called after the sheet has issued setApplicationLocales; just closes it. */
    fun onLanguagePicked() = _state.update { it.copy(languageMenuOpen = false) }

    private fun loadStats() {
        _state.update { it.copy(statsLoading = true, statsFailed = false) }
        viewModelScope.launch {
            val result = authRepository.myStats()
            _state.update {
                it.copy(
                    stats = (result as? ApiResult.Success)?.data ?: it.stats,
                    statsLoading = false,
                    // Only a failure with nothing to show is worth reporting.
                    statsFailed = result !is ApiResult.Success && it.stats == null,
                )
            }
        }
    }

    /** Retry for both halves of the screen, from the error state's button. */
    fun retry() {
        _state.update { it.copy(loadFailed = false) }
        viewModelScope.launch {
            val result = authRepository.getMe()
            if (result !is ApiResult.Success) {
                _state.update { it.copy(loadFailed = it.user == null) }
            }
        }
        loadStats()
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

    fun askLogout() = _state.update { it.copy(confirmingLogout = true) }

    fun dismissLogout() = _state.update { it.copy(confirmingLogout = false) }

    fun logout() {
        _state.update { it.copy(confirmingLogout = false) }
        viewModelScope.launch {
            authRepository.logout()
            _state.update { it.copy(loggedOut = true) }
        }
    }
}
