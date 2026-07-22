package com.meydan.app.core.common

import java.time.LocalDate
import java.time.LocalDateTime
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GameTimeTest {

    private val today: LocalDate = LocalDate.of(2026, 7, 22)

    @Test
    fun `same date is Today and next date is Tomorrow`() {
        val tonight = LocalDateTime.of(2026, 7, 22, 21, 30)
        val tomorrowEve = LocalDateTime.of(2026, 7, 23, 19, 0)
        assertEquals(GameTime.Day.Today, GameTime.day(tonight, Locale.forLanguageTag("ru"), today))
        assertEquals(GameTime.Day.Tomorrow, GameTime.day(tomorrowEve, Locale.forLanguageTag("ru"), today))
    }

    @Test
    fun `later dates format as short day-month in the requested locale`() {
        val later = LocalDateTime.of(2026, 8, 5, 18, 0)
        val day = GameTime.day(later, Locale.forLanguageTag("ru"), today)
        assertTrue(day is GameTime.Day.Other)
        val formatted = (day as GameTime.Day.Other).formatted
        assertTrue("got: $formatted", formatted.startsWith("5"))
    }

    @Test
    fun `time renders 24h with minutes`() {
        assertEquals("09:05", GameTime.time(LocalDateTime.of(2026, 7, 22, 9, 5)))
        assertEquals("21:30", GameTime.time(LocalDateTime.of(2026, 7, 22, 21, 30)))
    }

    @Test
    fun `parse accepts ISO instants and rejects garbage`() {
        assertNull(GameTime.parse("not-a-date"))
        val parsed = GameTime.parse("2026-07-22T16:00:00.000Z")
        assertEquals(2026, parsed?.year)
    }

    @Test
    fun `isToday is true for today and earlier, false for tomorrow`() {
        assertTrue(GameTime.isToday(LocalDateTime.of(2026, 7, 22, 23, 59), today))
        assertTrue(!GameTime.isToday(LocalDateTime.of(2026, 7, 23, 0, 1), today))
    }
}
