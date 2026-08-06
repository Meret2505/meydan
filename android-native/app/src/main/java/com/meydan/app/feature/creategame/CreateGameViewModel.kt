package com.meydan.app.feature.creategame

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.CreateGameRequest
import com.meydan.app.core.network.dto.FieldCardDto
import com.meydan.app.data.FieldsRepository
import com.meydan.app.data.GamesRepository
import java.time.LocalDateTime
import java.time.ZoneId
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the create-game form. Mirrors the web CreateGameForm: a field is either
 * picked from the catalogue or typed free-text, spots come from a fixed set,
 * needed positions are multi-select, price and notes optional. The chosen local
 * time is sent as a UTC instant so the server stores it unambiguously.
 */
class CreateGameViewModel(
    private val gamesRepository: GamesRepository,
    private val fieldsRepository: FieldsRepository,
    now: LocalDateTime,
) : ViewModel() {

    companion object {
        val SPOT_OPTIONS = listOf(6, 8, 10, 12, 14)
        val POSITIONS = listOf("GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD")
    }

    data class UiState(
        val fields: List<FieldCardDto> = emptyList(),
        val useCustomField: Boolean = false,
        val selectedFieldId: String? = null,
        val customFieldName: String = "",
        val scheduledAt: LocalDateTime,
        val totalSpots: Int = 10,
        val price: String = "",
        val notes: String = "",
        val positions: Set<String> = emptySet(),
        val submitting: Boolean = false,
        val errorCode: String? = null,
        val createdGameId: String? = null,
    ) {
        val canSubmit: Boolean
            get() = !submitting &&
                (if (useCustomField) customFieldName.trim().isNotEmpty() else selectedFieldId != null)
    }

    // Default to the next round hour + 2h, matching the web's defaultScheduled().
    private val defaultTime = now.withMinute(0).withSecond(0).withNano(0).plusHours(2)

    private val _state = MutableStateFlow(UiState(scheduledAt = defaultTime))
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            // Cached fields first so the picker is populated instantly; a fresh
            // list replaces it. If there are no fields, start in free-text mode.
            val cached = fieldsRepository.cached()
            if (cached != null) applyFields(cached)
            (fieldsRepository.refresh() as? ApiResult.Success)?.let { applyFields(it.data) }
        }
    }

    private fun applyFields(fields: List<FieldCardDto>) {
        _state.update {
            it.copy(fields = fields, useCustomField = it.useCustomField || fields.isEmpty())
        }
    }

    fun selectField(id: String) = _state.update { it.copy(selectedFieldId = id, errorCode = null) }
    fun setCustomField(name: String) = _state.update { it.copy(customFieldName = name, errorCode = null) }
    fun useCatalogue() = _state.update { it.copy(useCustomField = false, customFieldName = "") }
    fun useFreeText() = _state.update { it.copy(useCustomField = true, selectedFieldId = null) }
    fun setDateTime(dt: LocalDateTime) = _state.update { it.copy(scheduledAt = dt) }
    fun setTotalSpots(n: Int) = _state.update { it.copy(totalSpots = n) }
    fun setPrice(v: String) = _state.update { it.copy(price = v.filter { c -> c.isDigit() }.take(3)) }
    fun setNotes(v: String) = _state.update { it.copy(notes = v) }

    fun togglePosition(p: String) = _state.update {
        it.copy(positions = if (it.positions.contains(p)) it.positions - p else it.positions + p)
    }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.update { it.copy(submitting = true, errorCode = null) }
        viewModelScope.launch {
            val instant = s.scheduledAt.atZone(ZoneId.systemDefault()).toInstant().toString()
            val req = CreateGameRequest(
                scheduledAt = instant,
                fieldId = if (s.useCustomField) null else s.selectedFieldId,
                fieldName = if (s.useCustomField) s.customFieldName.trim() else null,
                totalSpots = s.totalSpots,
                pricePerPlayer = s.price.toIntOrNull(),
                notes = s.notes.trim().ifEmpty { null },
                neededPositions = s.positions.toList(),
            )
            when (val result = gamesRepository.createGame(req)) {
                is ApiResult.Success -> _state.update { it.copy(submitting = false, createdGameId = result.data.id) }
                is ApiResult.Failure -> _state.update { it.copy(submitting = false, errorCode = result.code) }
                ApiResult.NetworkError -> _state.update { it.copy(submitting = false, errorCode = "network") }
            }
        }
    }
}
