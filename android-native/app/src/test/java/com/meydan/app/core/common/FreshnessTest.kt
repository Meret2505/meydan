package com.meydan.app.core.common

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Every list tab loaded twice on entry: the ViewModel fetches in `init`, and
 * the screen fetches again from its enter/resume effect. The comment in
 * GamesScreen claimed ON_RESUME does not fire on first composition, but
 * LifecycleRegistry brings a newly added observer up to the current state, so
 * it does — five requests to paint the home screen, two of them identical.
 *
 * Rather than delete the resume refresh (which is what surfaces a game created
 * on another screen), a refresh is skipped when one just happened.
 */
class FreshnessTest {

    @Test
    fun `the first load always runs`() {
        assertTrue(isStale(now = 0L, lastLoadedAt = null))
    }

    @Test
    fun `a refresh moments after the initial load is skipped`() {
        // This is the double-load case: init fetches at t=0, the screen's
        // ON_RESUME effect asks again a few hundred ms later.
        assertFalse(isStale(now = 300L, lastLoadedAt = 0L))
    }

    @Test
    fun `returning to a tab later refreshes`() {
        assertTrue(isStale(now = MIN_REFRESH_INTERVAL_MS + 1, lastLoadedAt = 0L))
    }

    @Test
    fun `the interval boundary counts as stale`() {
        assertTrue(isStale(now = MIN_REFRESH_INTERVAL_MS, lastLoadedAt = 0L))
    }

    @Test
    fun `a clock that jumped backwards still refreshes`() {
        // currentTimeMillis can move backwards (NTP, user changing the clock).
        // Better a wasted request than a tab that never refreshes again.
        assertTrue(isStale(now = 1_000L, lastLoadedAt = 9_000_000L))
    }

    @Test
    fun `a caller can demand a refresh regardless`() {
        // Pull-to-refresh must never be swallowed.
        assertTrue(isStale(now = 10L, lastLoadedAt = 0L, force = true))
    }
}
