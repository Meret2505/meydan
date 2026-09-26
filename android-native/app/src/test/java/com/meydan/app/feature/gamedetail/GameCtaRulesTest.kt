package com.meydan.app.feature.gamedetail

import com.meydan.app.R
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.core.network.dto.OrganizerDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The truth table for the bottom bar.
 *
 * Written against the five branches exactly as they were, before any team
 * match exists, so that adding the match axis later is a change with a
 * regression suite underneath it rather than a rewrite of untested ordering.
 *
 * The branches are *ordered* — each was an early return — so the tests that
 * matter most are the ones where two conditions are true at once and only the
 * order decides the answer.
 */
class GameCtaRulesTest {

    private fun game(
        isOrganizer: Boolean = false,
        isPast: Boolean = false,
        joined: Boolean = false,
        isFull: Boolean = false,
        status: String = "OPEN",
    ) = GameDetailDto(
        id = "g1",
        scheduledAt = "2026-10-01T19:00:00Z",
        status = status,
        venue = "Meydan Arena",
        totalSpots = 10,
        joinedCount = if (isFull) 10 else 3,
        openSlots = if (isFull) 0 else 7,
        neededPositions = emptyList(),
        format = "5×5",
        isOrganizer = isOrganizer,
        joined = joined,
        isFull = isFull,
        isPast = isPast,
        organizer = OrganizerDto(id = "u1", name = "Meret", gamesPlayed = 4),
        participants = emptyList(),
    )

    private fun single(cta: GameCta): CtaButtonSpec {
        assertTrue("expected a button, got $cta", cta is GameCta.Single)
        return (cta as GameCta.Single).button
    }

    @Test
    fun `an upcoming game offers to join`() {
        val button = single(GameCtaRules.ctaFor(game()))

        assertEquals(R.string.games_join_cta, button.label)
        assertEquals(CtaAction.TOGGLE_JOIN, button.action)
        assertEquals(CtaTone.PRIMARY, button.tone)
        assertTrue(button.enabled)
    }

    @Test
    fun `a game you joined offers to leave, in the quiet colour`() {
        val button = single(GameCtaRules.ctaFor(game(joined = true)))

        assertEquals(R.string.games_joined_cta, button.label)
        assertEquals(CtaTone.NEUTRAL, button.tone)
        assertTrue(button.enabled)
    }

    @Test
    fun `a full game you are not in is shown but refused`() {
        // Deliberately still the primary colour: it reads as the action you
        // would take if there were room, greyed by `enabled` alone.
        val button = single(GameCtaRules.ctaFor(game(isFull = true)))

        assertEquals(R.string.games_full, button.label)
        assertEquals(CtaTone.PRIMARY, button.tone)
        assertEquals(false, button.enabled)
    }

    @Test
    fun `a full game you are already in still offers to leave`() {
        val button = single(GameCtaRules.ctaFor(game(isFull = true, joined = true)))

        assertEquals(R.string.games_joined_cta, button.label)
        assertTrue(button.enabled)
    }

    @Test
    fun `the organizer of an upcoming game gets cancel`() {
        val button = single(GameCtaRules.ctaFor(game(isOrganizer = true)))

        assertEquals(R.string.games_cancel_cta, button.label)
        assertEquals(CtaAction.CANCEL_GAME, button.action)
        assertEquals(CtaTone.DESTRUCTIVE, button.tone)
    }

    @Test
    fun `the organizer of a played game gets the write-up`() {
        // The only route to the result sheet in the whole app — the feeds drop
        // a game at kickoff, so losing this branch loses the feature silently.
        val button = single(GameCtaRules.ctaFor(game(isOrganizer = true, isPast = true)))

        assertEquals(R.string.games_result_cta, button.label)
        assertEquals(CtaAction.RECORD_RESULT, button.action)
    }

    @Test
    fun `the organizer of a completed game can still write it up`() {
        // Re-recording is allowed on purpose: a wrong tick must be fixable.
        val button = single(
            GameCtaRules.ctaFor(game(isOrganizer = true, isPast = true, status = "COMPLETED")),
        )

        assertEquals(R.string.games_result_cta, button.label)
    }

    @Test
    fun `the organizer of a cancelled game gets no action at all`() {
        // The one case the write-up branch excludes by status, so it falls
        // through to the inert chip.
        val cta = GameCtaRules.ctaFor(
            game(isOrganizer = true, isPast = true, status = "CANCELLED"),
        )

        assertEquals(GameCta.Status(R.string.games_cancelled_full), cta)
    }

    @Test
    fun `a cancelled game says so, whoever is looking`() {
        assertEquals(
            GameCta.Status(R.string.games_cancelled_full),
            GameCtaRules.ctaFor(game(status = "CANCELLED")),
        )
    }

    @Test
    fun `a completed game says so`() {
        assertEquals(
            GameCta.Status(R.string.games_completed),
            GameCtaRules.ctaFor(game(status = "COMPLETED", isPast = true)),
        )
    }

    @Test
    fun `a past game nobody wrote up says it has been played`() {
        assertEquals(
            GameCta.Status(R.string.games_is_past),
            GameCtaRules.ctaFor(game(isPast = true)),
        )
    }

    @Test
    fun `the organizer of an upcoming cancelled game is told, not offered cancel again`() {
        // Ordering: the cancel branch requires `!isOver`, so a cancelled game
        // reaches the chip even though the viewer is the organizer and the
        // kickoff is ahead. Pinning it because the reading is not obvious.
        assertEquals(
            GameCta.Status(R.string.games_cancelled_full),
            GameCtaRules.ctaFor(game(isOrganizer = true, status = "CANCELLED")),
        )
    }
}
