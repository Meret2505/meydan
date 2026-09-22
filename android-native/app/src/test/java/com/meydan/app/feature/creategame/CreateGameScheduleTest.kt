package com.meydan.app.feature.creategame

import java.time.LocalDateTime
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Nothing stopped a game being created in the past — not the picker, not the
 * form, not the server — and the result was silent: every feed asks for
 * `scheduledAt >= now`, so the game was created successfully and then visible
 * to nobody. The server now rejects it too; this is the half that tells the
 * user before they submit.
 */
class CreateGameScheduleTest {

    private val now = LocalDateTime.of(2026, 9, 22, 20, 30)

    @Test
    fun `a time later today is fine`() {
        assertFalse(isScheduledInPast(LocalDateTime.of(2026, 9, 22, 22, 0), now))
    }

    @Test
    fun `yesterday is not`() {
        assertTrue(isScheduledInPast(LocalDateTime.of(2026, 9, 21, 21, 0), now))
    }

    @Test
    fun `earlier today is not — the date picker cannot catch this one`() {
        // The picker only constrains the day, so 18:00 on the current day is
        // reachable at 20:30 and has to be caught here.
        assertTrue(isScheduledInPast(LocalDateTime.of(2026, 9, 22, 18, 0), now))
    }

    @Test
    fun `the current minute is allowed, not treated as past`() {
        assertFalse(isScheduledInPast(now, now))
    }

    @Test
    fun `a minute ago is past`() {
        assertTrue(isScheduledInPast(now.minusMinutes(1), now))
    }
}
