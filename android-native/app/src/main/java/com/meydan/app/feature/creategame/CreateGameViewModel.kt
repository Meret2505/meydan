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
/**
 * Whether a picked kickoff has already passed. The date picker only constrains
 * the day, so an earlier time on the current day gets through it and has to be
 * caught here. Pure, so it is unit-tested.
 */
fun isScheduledInPast(scheduledAt: LocalDateTime, now: LocalDateTime): Boolean =
    scheduledAt.isBefore(now)

class CreateGameViewModel(
    private val gamesRepository: GamesRepository,
    private val fieldsRepository: FieldsRepository,
    now: LocalDateTime,
    /** When opened from a field's detail, the field to preselect once loaded. */
    private val preselectFieldId: String? = null,
) : ViewModel() {

    companion object {
        val SPOT_OPTIONS = listOf(6, 8, 10, 12, 14)
        val POSITIONS = listOf("GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD")
    }

    data class UiState(
        val fields: List<FieldCardDto> = emptyList(),
        /**
         * True until the catalogue has been fetched (or failed).
         *
         * Without it an empty list read as "there are no pitches", and the form
         * silently dropped the user into typing a pitch name by hand — the
         * normal case on a slow connection, with no spinner, no explanation and
         * no way back to the picker once the data landed.
         */
        val fieldsLoading: Boolean = true,
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
        /** Recomputed on every pick; see [isScheduledInPast]. */
        val scheduledInPast: Boolean = false,
    ) {
        val canSubmit: Boolean
            get() = !submitting &&
                !scheduledInPast &&
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
            // Only now is an empty catalogue really empty, so only now may the
            // form fall back to free text.
            _state.update {
                it.copy(
                    fieldsLoading = false,
                    useCustomField = it.useCustomField || it.fields.isEmpty(),
                )
            }
        }
    }

    private fun applyFields(fields: List<FieldCardDto>) {
        _state.update {
            // Preselect the field passed from its detail (catalogue mode), but only
            // if it exists in the loaded list and the user hasn't picked yet.
            val preselect = preselectFieldId
                ?.takeIf { id -> it.selectedFieldId == null && fields.any { f -> f.id == id } }
            it.copy(
                fields = fields,
                selectedFieldId = preselect ?: it.selectedFieldId,
                // The empty-list fallback is deferred until loading finishes
                // (see init) so a slow fetch is not mistaken for an empty
                // catalogue.
                useCustomField = if (preselect != null) false else it.useCustomField,
            )
        }
    }

    fun selectField(id: String) = _state.update { it.copy(selectedFieldId = id, errorCode = null) }
    fun setCustomField(name: String) = _state.update { it.copy(customFieldName = name, errorCode = null) }
    fun useCatalogue() = _state.update { it.copy(useCustomField = false, customFieldName = "") }
    fun useFreeText() = _state.update { it.copy(useCustomField = true, selectedFieldId = null) }
    fun setDateTime(dt: LocalDateTime) = _state.update {
        it.copy(
            scheduledAt = dt,
            // Checked against the clock now, not against the time the screen
            // opened: a form left open for an hour must not accept a time that
            // has since passed.
            scheduledInPast = isScheduledInPast(dt, LocalDateTime.now()),
            errorCode = null,
        )
    }
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
