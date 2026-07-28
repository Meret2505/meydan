package com.meydan.app.feature.fields

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.FieldCardDto
import com.meydan.app.data.FieldsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Fields tab state: offline-first load, client-side search, favorites-first
 * sort, and optimistic favorite toggles — mirroring the web FieldsView.
 *
 * The locale-dependent display name and sort live in the composable (it knows
 * the current locale); the ViewModel keeps everything locale-agnostic and
 * exposes the raw favorite/query state.
 */
class FieldsViewModel(
    private val fieldsRepository: FieldsRepository,
) : ViewModel() {

    data class UiState(
        val fields: List<FieldCardDto> = emptyList(),
        val query: String = "",
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            fieldsRepository.cached()?.let { cached ->
                _state.update { it.copy(fields = cached, loading = false) }
            }
            load()
        }
    }

    fun onQueryChange(q: String) = _state.update { it.copy(query = q) }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { load() }
    }

    /**
     * Flips the star immediately, then reconciles with the server; on failure
     * the optimistic change is rolled back so the UI never lies about state.
     */
    fun toggleFavorite(fieldId: String) {
        val current = _state.value.fields.firstOrNull { it.id == fieldId } ?: return
        val target = !current.favorite
        _state.update { it.copy(fields = it.fields.setFavorite(fieldId, target)) }
        viewModelScope.launch {
            val result = fieldsRepository.setFavorite(fieldId, target)
            if (result is ApiResult.Success) {
                _state.update { it.copy(fields = it.fields.setFavorite(fieldId, result.data)) }
            } else {
                // Roll back.
                _state.update { it.copy(fields = it.fields.setFavorite(fieldId, current.favorite)) }
            }
        }
    }

    private suspend fun load() {
        when (val result = fieldsRepository.refresh()) {
            is ApiResult.Success -> _state.update {
                it.copy(fields = result.data, loading = false, refreshing = false, offline = false)
            }
            is ApiResult.Failure, ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, refreshing = false, offline = true)
            }
        }
    }

    private fun List<FieldCardDto>.setFavorite(id: String, favorite: Boolean) =
        map { if (it.id == id) it.copy(favorite = favorite) else it }

    companion object {
        /** Localized display name — Turkmen or Russian, falling back to base. */
        fun displayName(field: FieldCardDto, isTurkmen: Boolean): String =
            (if (isTurkmen) field.nameTm else field.nameRu) ?: field.name

        /**
         * Search filters on localized name + district; results are
         * favorites-first then alphabetic — identical to the web FieldsView.
         * Pure and locale-parameterized so it is unit-testable.
         */
        fun filterAndSort(
            fields: List<FieldCardDto>,
            query: String,
            isTurkmen: Boolean,
        ): List<FieldCardDto> {
            val q = query.trim().lowercase()
            return fields
                .filter {
                    q.isEmpty() ||
                        displayName(it, isTurkmen).lowercase().contains(q) ||
                        it.district.lowercase().contains(q)
                }
                .sortedWith(
                    compareBy({ !it.favorite }, { displayName(it, isTurkmen).lowercase() }),
                )
        }
    }
}
