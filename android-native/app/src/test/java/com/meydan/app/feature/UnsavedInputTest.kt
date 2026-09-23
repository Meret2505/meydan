package com.meydan.app.feature

import com.meydan.app.feature.creategame.CreateGameViewModel
import com.meydan.app.feature.createteam.CreateTeamViewModel
import com.meydan.app.feature.createtournament.CreateTournamentViewModel
import com.meydan.app.feature.profileedit.ProfileEditViewModel
import com.meydan.app.feature.submitfield.SubmitFieldViewModel
import java.time.LocalDate
import java.time.LocalDateTime
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The contract behind rememberExitGuard, for every form that has one.
 *
 * Three properties, and each one is a way the guard could go wrong in a way no
 * one would notice until they lost a form: a *fresh* form must not ask anything
 * (or Back stops working on the screen someone opened by mistake), a *touched*
 * form must ask, and a *submitted* form must not — the success path navigates
 * away on its own, and a confirmation in front of that would look like the app
 * refusing to leave.
 *
 * Asserted on the states rather than through the ViewModels because the
 * repositories are concrete classes wanting a Retrofit service and a DataStore;
 * the setters that raise the flag are one-liners, and this is where the flag is
 * read.
 */
class UnsavedInputTest {

    private val someDay: LocalDate = LocalDate.of(2026, 6, 1)
    private val someTime: LocalDateTime = LocalDateTime.of(2026, 6, 1, 20, 0)

    @Test
    fun `a fresh form has nothing to lose`() {
        assertFalse(CreateTeamViewModel.UiState().hasUnsavedInput)
        assertFalse(CreateTournamentViewModel.UiState(startDate = someDay).hasUnsavedInput)
        assertFalse(CreateGameViewModel.UiState(scheduledAt = someTime).hasUnsavedInput)
        assertFalse(SubmitFieldViewModel.UiState().hasUnsavedInput)
        assertFalse(ProfileEditViewModel.UiState().hasUnsavedInput)
    }

    @Test
    fun `a form seeded from the server still has nothing to lose`() {
        // What ProfileEditViewModel.seed and CreateGameViewModel.applyFields
        // produce: a populated form the user has not touched. Leaving it must
        // not ask, because there is nothing of theirs in it.
        assertFalse(
            ProfileEditViewModel.UiState(
                loaded = true,
                name = "Мерет",
                district = "Berzengi",
                skillLevel = "INTERMEDIATE",
                age = "27",
            ).hasUnsavedInput,
        )
        assertFalse(
            CreateGameViewModel.UiState(
                scheduledAt = someTime,
                fieldsLoading = false,
                selectedFieldId = "preselected-from-field-detail",
            ).hasUnsavedInput,
        )
    }

    @Test
    fun `a touched form asks before it is thrown away`() {
        assertTrue(CreateTeamViewModel.UiState(edited = true).hasUnsavedInput)
        assertTrue(
            CreateTournamentViewModel.UiState(startDate = someDay, edited = true).hasUnsavedInput,
        )
        assertTrue(
            CreateGameViewModel.UiState(scheduledAt = someTime, edited = true).hasUnsavedInput,
        )
        assertTrue(SubmitFieldViewModel.UiState(edited = true).hasUnsavedInput)
        assertTrue(ProfileEditViewModel.UiState(edited = true).hasUnsavedInput)
    }

    @Test
    fun `a form that succeeded does not ask on the way out`() {
        assertFalse(
            CreateTeamViewModel.UiState(edited = true, createdTeamId = "t1").hasUnsavedInput,
        )
        assertFalse(
            CreateTournamentViewModel.UiState(
                startDate = someDay,
                edited = true,
                createdId = "tr1",
            ).hasUnsavedInput,
        )
        assertFalse(
            CreateGameViewModel.UiState(
                scheduledAt = someTime,
                edited = true,
                createdGameId = "g1",
            ).hasUnsavedInput,
        )
        assertFalse(
            SubmitFieldViewModel.UiState(edited = true, createdId = "s1").hasUnsavedInput,
        )
        assertFalse(ProfileEditViewModel.UiState(edited = true, saved = true).hasUnsavedInput)
    }

    @Test
    fun `a failed submit keeps the form and its guard`() {
        // The error is shown in place and the input is still on screen, so Back
        // is still destructive — this is the state a retry happens from.
        assertTrue(
            SubmitFieldViewModel.UiState(edited = true, errorCode = "network").hasUnsavedInput,
        )
        assertTrue(
            CreateTeamViewModel.UiState(edited = true, errorCode = "network").hasUnsavedInput,
        )
    }
}
