package com.meydan.app.feature.submitfield

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.network.dto.CreateFieldSubmissionRequest
import com.meydan.app.data.FieldSubmissionsRepository
import com.meydan.app.feature.fields.FieldsViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * A photo picked for the submission. The screen resolves the Uri to bytes at
 * pick time (via ContentResolver) and hands the ViewModel raw bytes only —
 * same split of responsibility as ProfileScreen's avatar picker. [previewUri]
 * is kept as a plain string (Coil takes one as happily as a Uri) only so the
 * screen can render a thumbnail without re-reading the bytes; keeping the
 * Android type out of here is what lets the pick logic be unit-tested.
 */
class PickedPhoto(
    val previewUri: String,
    val bytes: ByteArray,
    val mime: String,
    val filename: String,
)

/**
 * Backs the field-submission form. Mirrors CreateTeamViewModel's shape:
 * computed `canSubmit`, setters that clamp length and clear `errorCode`,
 * NetworkError mapped to the "network" sentinel.
 *
 * Validation mirrors lib/services/field-submissions.ts's normalizeCreateInput
 * exactly, so the button disables locally rather than round-tripping to find
 * out the input is bad — the server re-validates independently either way.
 */
class SubmitFieldViewModel(
    private val repository: FieldSubmissionsRepository,
) : ViewModel() {

    companion object {
        const val MIN_NAME_LENGTH = 2
        const val MAX_NAME_LENGTH = 80
        const val MIN_ADDRESS_LENGTH = 4
        const val MAX_ADDRESS_LENGTH = 200
        const val MIN_CAPACITY = 4
        const val MAX_CAPACITY = 40
        const val MAX_DESCRIPTION_LENGTH = 500
        const val MAX_PHOTOS = 3

        /** Must stay in step with SURFACES in lib/data.ts. */
        val SURFACES = FieldsViewModel.SURFACES

        /**
         * The gallery after a multi-select pick, trimmed to the three photos a
         * submission may carry (the server caps it at three as well). A new
         * list, never a mutation of [existing].
         */
        fun photosAfterPick(
            existing: List<PickedPhoto>,
            picked: List<PickedPhoto>,
        ): List<PickedPhoto> {
            val room = MAX_PHOTOS - existing.size
            return if (room <= 0) existing else existing + picked.take(room)
        }
    }

    /**
     * A required input the form is still not happy with. The screen turns these
     * into a line under the button naming what is left, because a button that
     * stays grey while every visible input looks filled is unusable — the
     * capacity placeholder alone ("12", in grey) reads as a value already set.
     */
    enum class RequiredField { NAME, ADDRESS, DISTRICT, SURFACE, CAPACITY, DESCRIPTION }

    data class UiState(
        val name: String = "",
        val address: String = "",
        val district: String? = null,
        val surface: String? = null,
        /** Held as text so an empty/partial field doesn't crash on a bad parse. */
        val capacity: String = "",
        val phoneDigits: String = "",
        val description: String = "",
        val photos: List<PickedPhoto> = emptyList(),
        val submitting: Boolean = false,
        val errorCode: String? = null,
        val createdId: String? = null,
    ) {
        /**
         * Required inputs still not accepted, in the order they appear on the
         * form. The one source of truth for both the button's enabled state and
         * the hint that explains it, so the two can never disagree.
         */
        val missing: List<RequiredField>
            get() = buildList {
                if (name.trim().length !in MIN_NAME_LENGTH..MAX_NAME_LENGTH) {
                    add(RequiredField.NAME)
                }
                if (address.trim().length !in MIN_ADDRESS_LENGTH..MAX_ADDRESS_LENGTH) {
                    add(RequiredField.ADDRESS)
                }
                if (district == null) add(RequiredField.DISTRICT)
                if (surface == null) add(RequiredField.SURFACE)
                val cap = capacity.toIntOrNull()
                if (cap == null || cap !in MIN_CAPACITY..MAX_CAPACITY) {
                    add(RequiredField.CAPACITY)
                }
                // setDescription already clamps the length, so this can only
                // fire if that cap is ever loosened — it mirrors the server.
                if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
                    add(RequiredField.DESCRIPTION)
                }
            }

        val canSubmit: Boolean get() = !submitting && missing.isEmpty()

        /**
         * Whether an input holds something that is already wrong, as opposed to
         * being untouched — only then is it worth marking red. An empty field
         * shows its requirement in plain grey instead of shouting at someone
         * who has not typed yet.
         */
        val nameTooShort: Boolean
            get() = name.trim().isNotEmpty() && name.trim().length < MIN_NAME_LENGTH

        val addressTooShort: Boolean
            get() = address.trim().isNotEmpty() && address.trim().length < MIN_ADDRESS_LENGTH

        val capacityOutOfRange: Boolean
            get() = capacity.isNotEmpty() &&
                capacity.toIntOrNull().let { it == null || it !in MIN_CAPACITY..MAX_CAPACITY }
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun setName(v: String) = _state.update { it.copy(name = v.take(MAX_NAME_LENGTH), errorCode = null) }
    fun setAddress(v: String) =
        _state.update { it.copy(address = v.take(MAX_ADDRESS_LENGTH), errorCode = null) }
    fun setDistrict(v: String) = _state.update { it.copy(district = v) }
    fun setSurface(v: String) = _state.update { it.copy(surface = v) }
    fun setCapacity(v: String) =
        _state.update { it.copy(capacity = v.filter(Char::isDigit).take(2), errorCode = null) }
    fun setPhoneDigits(v: String) = _state.update { it.copy(phoneDigits = v, errorCode = null) }
    fun setDescription(v: String) =
        _state.update { it.copy(description = v.take(MAX_DESCRIPTION_LENGTH), errorCode = null) }

    /**
     * Adds a whole pick at once — the picker is multi-select, so three photos
     * arrive together rather than one trip through the gallery per photo.
     */
    fun addPhotos(picked: List<PickedPhoto>) {
        if (picked.isEmpty()) return
        _state.update { it.copy(photos = photosAfterPick(it.photos, picked)) }
    }

    fun removePhoto(index: Int) =
        _state.update { it.copy(photos = it.photos.filterIndexed { i, _ -> i != index }) }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.update { it.copy(submitting = true, errorCode = null) }
        viewModelScope.launch {
            val req = CreateFieldSubmissionRequest(
                name = s.name.trim(),
                address = s.address.trim(),
                district = s.district!!,
                surface = s.surface!!,
                capacity = s.capacity.toInt(),
                phone = if (s.phoneDigits.length == 8) "+993${s.phoneDigits}" else null,
                description = s.description.trim().ifBlank { null },
            )
            when (val result = repository.create(req)) {
                is ApiResult.Success -> {
                    val submissionId = result.data.id
                    // Best-effort: the submission itself already succeeded and
                    // is queued for review, so a photo failure here doesn't
                    // fail the whole flow — it just means fewer photos on it.
                    for (photo in s.photos) {
                        repository.addPhoto(submissionId, photo.bytes, photo.mime, photo.filename)
                    }
                    _state.update { it.copy(submitting = false, createdId = submissionId) }
                }
                is ApiResult.Failure ->
                    _state.update { it.copy(submitting = false, errorCode = result.code) }
                ApiResult.NetworkError ->
                    _state.update { it.copy(submitting = false, errorCode = "network") }
            }
        }
    }
}
