package com.meydan.app.core.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * A one-shot loader ViewModel for read-only detail screens (field, team,
 * tournament). Runs [load] on init, exposing loading / data / error, with a
 * retry. Shared so the three detail screens don't each repeat the same
 * boilerplate.
 */
class DetailViewModel<T>(
    private val load: suspend () -> ApiResult<T>,
) : ViewModel() {

    data class UiState<T>(
        val data: T? = null,
        val loading: Boolean = true,
        val error: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState<T>())
    val state: StateFlow<UiState<T>> = _state.asStateFlow()

    init {
        fetch()
    }

    fun retry() {
        _state.update { it.copy(loading = true, error = false) }
        fetch()
    }

    private fun fetch() {
        viewModelScope.launch {
            when (val result = load()) {
                is ApiResult.Success ->
                    _state.update { it.copy(data = result.data, loading = false, error = false) }
                is ApiResult.Failure, ApiResult.NetworkError ->
                    _state.update { it.copy(loading = false, error = true) }
            }
        }
    }
}
