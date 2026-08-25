package com.meydan.app.feature.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.NotificationDto
import com.meydan.app.data.NotificationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Notifications screen state: a one-shot load on open. On success it also fires
 * mark-all-read so the feed's bell badge clears — the same behaviour as the
 * web page's mark-all-read-on-mount. The read call is fire-and-forget: the list
 * is already shown, and a failure only leaves the badge for the next visit.
 */
class NotificationsViewModel(
    private val repository: NotificationsRepository,
) : ViewModel() {

    data class UiState(
        val loading: Boolean = true,
        val items: List<NotificationDto> = emptyList(),
        val unreadCount: Int = 0,
        val error: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        load()
    }

    fun retry() {
        _state.update { it.copy(loading = true, error = false) }
        load()
    }

    private fun load() {
        viewModelScope.launch {
            when (val result = repository.list()) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            loading = false,
                            items = result.data.notifications,
                            unreadCount = result.data.unreadCount,
                            error = false,
                        )
                    }
                    repository.markAllRead()
                }
                is ApiResult.Failure, ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, error = true) }
            }
        }
    }
}
