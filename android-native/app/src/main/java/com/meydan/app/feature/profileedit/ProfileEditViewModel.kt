package com.meydan.app.feature.profileedit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.Position
import com.meydan.app.core.network.dto.ProfilePatch
import com.meydan.app.core.network.dto.UserDto
import com.meydan.app.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Backs the profile-edit screen. Port of the web ProfileEditForm: name,
 * position, district, skill level, age and open-to-invites. Seeds from the
 * cached user first (instant) then a fresh /me, and PATCHes the whole form on
 * save — the server ignores unchanged fields.
 */
class ProfileEditViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    companion object {
        val SKILLS = listOf("BEGINNER", "INTERMEDIATE", "ADVANCED")
    }

    data class UiState(
        val loaded: Boolean = false,
        val name: String = "",
        val position: Position? = null,
        val district: String? = null,
        val skillLevel: String = "BEGINNER",
        val age: String = "",
        val isOpenToInvite: Boolean = false,
        val submitting: Boolean = false,
        val errorCode: String? = null,
        val saved: Boolean = false,
    ) {
        val canSubmit: Boolean
            get() = !submitting && name.trim().isNotEmpty()
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.cachedUser()?.let(::seed)
            (authRepository.getMe() as? ApiResult.Success)?.let { seed(it.data.user) }
        }
    }

    /** Populates the form from a user record, but never clobbers edits in progress. */
    private fun seed(user: UserDto) {
        _state.update {
            if (it.loaded) return@update it
            it.copy(
                loaded = true,
                name = user.name,
                position = Position.entries.find { p -> p.name == user.position },
                district = user.district,
                skillLevel = if (user.skillLevel in SKILLS) user.skillLevel else "BEGINNER",
                age = user.age?.toString() ?: "",
                isOpenToInvite = user.isOpenToInvite,
            )
        }
    }

    fun setName(v: String) = _state.update { it.copy(name = v, errorCode = null) }
    fun setPosition(p: Position) = _state.update { it.copy(position = p) }
    fun setDistrict(d: String) = _state.update { it.copy(district = d) }
    fun setSkill(s: String) = _state.update { it.copy(skillLevel = s) }
    fun setAge(v: String) = _state.update { it.copy(age = v.filter { c -> c.isDigit() }.take(3)) }
    fun setOpenToInvite(v: Boolean) = _state.update { it.copy(isOpenToInvite = v) }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.update { it.copy(submitting = true, errorCode = null) }
        viewModelScope.launch {
            val patch = ProfilePatch(
                name = s.name.trim(),
                position = s.position?.name,
                district = s.district,
                skillLevel = s.skillLevel,
                // Sent even when blank so clearing the field clears the stored age,
                // matching the web form (parseAge("") -> null).
                age = s.age,
                isOpenToInvite = s.isOpenToInvite,
            )
            when (val result = authRepository.updateProfile(patch)) {
                is ApiResult.Success -> _state.update { it.copy(submitting = false, saved = true) }
                is ApiResult.Failure -> _state.update { it.copy(submitting = false, errorCode = result.code) }
                ApiResult.NetworkError -> _state.update { it.copy(submitting = false, errorCode = "network") }
            }
        }
    }
}
