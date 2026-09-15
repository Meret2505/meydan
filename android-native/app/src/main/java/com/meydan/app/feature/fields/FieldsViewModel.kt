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
        /** Active district filter, or null for all — single-select like the web. */
        val district: String? = null,
        /** Active surface filter (raw surface value), or null for all. */
        val surface: String? = null,
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

    /** Toggle a district filter; tapping the active one clears it (web parity). */
    fun onDistrictToggle(d: String) =
        _state.update { it.copy(district = if (it.district == d) null else d) }

    /** Toggle a surface filter; tapping the active one clears it (web parity). */
    fun onSurfaceToggle(s: String) =
        _state.update { it.copy(surface = if (it.surface == s) null else s) }

    fun pullRefresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch { load() }
    }

    /**
     * Re-runs whenever the tab is entered, so a field approved while the user
     * was on the submit form (or just away) shows up without waiting for a
     * manual pull — the one list tab that was missing this (see Teams/Games).
     */
    fun refreshOnEnter() {
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
        /** The three known surface values, matching the web's SURFACES list. */
        val SURFACES = listOf("Искусственная трава", "Резиновое", "Грунт")

        /** Localized display name — Turkmen or Russian, falling back to base. */
        fun displayName(field: FieldCardDto, isTurkmen: Boolean): String =
            (if (isTurkmen) field.nameTm else field.nameRu) ?: field.name

        /** Distinct districts present in the loaded fields, sorted — like the web chip row. */
        fun districtsOf(fields: List<FieldCardDto>): List<String> =
            fields.map { it.district }.distinct().sorted()

        /**
         * Search filters on localized name + district, then the district and
         * surface chip filters are AND-ed on top; results are favorites-first
         * then alphabetic — identical to the web FieldsView.
         * Pure and locale-parameterized so it is unit-testable.
         */
        fun filterAndSort(
            fields: List<FieldCardDto>,
            query: String,
            isTurkmen: Boolean,
            district: String? = null,
            surface: String? = null,
        ): List<FieldCardDto> {
            val q = query.trim().lowercase()
            return fields
                .filter {
                    (q.isEmpty() ||
                        displayName(it, isTurkmen).lowercase().contains(q) ||
                        it.district.lowercase().contains(q)) &&
                        (district == null || it.district == district) &&
                        (surface == null || it.surface == surface)
                }
                .sortedWith(
                    compareBy({ !it.favorite }, { displayName(it, isTurkmen).lowercase() }),
                )
        }
    }
}
