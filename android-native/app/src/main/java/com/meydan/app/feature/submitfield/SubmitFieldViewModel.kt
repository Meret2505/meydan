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
 * is kept only so the screen can render a thumbnail without re-reading bytes.
 */
class PickedPhoto(
    val previewUri: android.net.Uri,
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
    }

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
        val canSubmit: Boolean
            get() {
                val cap = capacity.toIntOrNull()
                return !submitting &&
                    name.trim().length in MIN_NAME_LENGTH..MAX_NAME_LENGTH &&
                    address.trim().length in MIN_ADDRESS_LENGTH..MAX_ADDRESS_LENGTH &&
                    district != null &&
                    surface != null &&
                    cap != null && cap in MIN_CAPACITY..MAX_CAPACITY &&
                    description.trim().length <= MAX_DESCRIPTION_LENGTH
            }
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

    fun addPhoto(bytes: ByteArray, mime: String, filename: String, previewUri: android.net.Uri) {
        _state.update {
            if (it.photos.size >= MAX_PHOTOS) return@update it
            it.copy(photos = it.photos + PickedPhoto(previewUri, bytes, mime, filename))
        }
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
