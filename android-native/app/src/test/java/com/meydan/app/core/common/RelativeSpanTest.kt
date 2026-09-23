package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Test

/** Boundaries of the notification timestamps, in the app's own wording. */
class RelativeSpanTest {

    private val now = 1_700_000_000_000L
    private fun ago(ms: Long) = relativeSpanOf(now - ms, now)

    @Test
    fun `under a minute is just now`() {
        assertEquals(RelativeSpan.JustNow, ago(0))
        assertEquals(RelativeSpan.JustNow, ago(59_999))
    }

    @Test
    fun `a clock ahead of the server still reads as just now`() {
        assertEquals(RelativeSpan.JustNow, relativeSpanOf(now + 60_000, now))
    }

    @Test
    fun `minutes up to an hour`() {
        assertEquals(RelativeSpan.Minutes(1), ago(60_000))
        assertEquals(RelativeSpan.Minutes(8), ago(8 * 60_000))
        assertEquals(RelativeSpan.Minutes(59), ago(59 * 60_000 + 59_000))
    }

    @Test
    fun `hours up to a day`() {
        assertEquals(RelativeSpan.Hours(1), ago(60 * 60_000))
        assertEquals(RelativeSpan.Hours(23), ago(23 * 60 * 60_000))
    }

    @Test
    fun `days after that`() {
        assertEquals(RelativeSpan.Days(1), ago(24 * 60 * 60_000L))
        assertEquals(RelativeSpan.Days(9), ago(9 * 24 * 60 * 60_000L))
    }
}
