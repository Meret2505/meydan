package com.meydan.app.feature.moderation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.FieldSubmissionDto
import com.meydan.app.data.FieldSubmissionsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the admin moderation queue: PENDING submissions, oldest first (the
 * server already orders them; this just renders what it returns). No offline
 * cache — this is a live queue, not a browsing surface, and a stale queue is
 * actively misleading (approving something already handled elsewhere).
 */
class FieldModerationViewModel(
    private val repository: FieldSubmissionsRepository,
) : ViewModel() {

    data class UiState(
        val submissions: List<FieldSubmissionDto> = emptyList(),
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        /** The submission currently being approved/rejected — disables its buttons. */
        val actioningId: String? = null,
        /** Non-null while the reject-reason dialog is open, holding the target id. */
        val rejectDialogFor: String? = null,
        val rejectReason: String = "",
        val errorCode: String? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch { load() }
    }

    fun refreshOnEnter() {
        viewModelScope.launch { load() }
    }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        when (val result = repository.listPending()) {
            is ApiResult.Success -> _state.update {
                it.copy(submissions = result.data, loading = false, refreshing = false, errorCode = null)
            }
            is ApiResult.Failure -> _state.update {
                it.copy(loading = false, refreshing = false, errorCode = result.code)
            }
            ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, errorCode = "network")
            }
        }
    }

    fun approve(id: String) {
        if (_state.value.actioningId != null) return
        _state.update { it.copy(actioningId = id, errorCode = null) }
        viewModelScope.launch {
            when (val result = repository.approve(id)) {
                is ApiResult.Success -> _state.update {
                    it.copy(actioningId = null, submissions = it.submissions.filterNot { s -> s.id == id })
                }
                is ApiResult.Failure -> _state.update {
                    it.copy(actioningId = null, errorCode = result.code)
                }
                ApiResult.NetworkError -> _state.update {
                    it.copy(actioningId = null, errorCode = "network")
                }
            }
        }
    }

    fun openRejectDialog(id: String) =
        _state.update { it.copy(rejectDialogFor = id, rejectReason = "") }

    fun dismissRejectDialog() =
        _state.update { it.copy(rejectDialogFor = null, rejectReason = "") }

    fun setRejectReason(v: String) = _state.update { it.copy(rejectReason = v.take(300)) }

    fun confirmReject() {
        val id = _state.value.rejectDialogFor ?: return
        if (_state.value.actioningId != null) return
        val reason = _state.value.rejectReason.trim().ifBlank { null }
        _state.update { it.copy(actioningId = id, errorCode = null) }
        viewModelScope.launch {
            when (val result = repository.reject(id, reason)) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        actioningId = null,
                        rejectDialogFor = null,
                        rejectReason = "",
                        submissions = it.submissions.filterNot { s -> s.id == id },
                    )
                }
                is ApiResult.Failure -> _state.update {
                    it.copy(actioningId = null, errorCode = result.code)
                }
                ApiResult.NetworkError -> _state.update {
                    it.copy(actioningId = null, errorCode = "network")
                }
            }
        }
    }
}
