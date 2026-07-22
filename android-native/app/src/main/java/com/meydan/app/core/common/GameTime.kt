package com.meydan.app.core.common

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Card time formatting, ported from lib/date.ts formatGameDateTime.
 *
 * The API sends scheduledAt as an ISO-8601 instant; cards show "19:00" plus a
 * day word — Today/Tomorrow in the UI language, otherwise "5 июл." style.
 * [dayWord] returns null for today/tomorrow so the caller can use its
 * localized string resources; everything else is formatted here.
 */
object GameTime {
    fun parse(iso: String): LocalDateTime? = try {
        Instant.parse(iso).atZone(ZoneId.systemDefault()).toLocalDateTime()
    } catch (e: Exception) {
        null
    }

    fun time(dt: LocalDateTime): String =
        dt.format(DateTimeFormatter.ofPattern("HH:mm"))

    sealed interface Day {
        data object Today : Day
        data object Tomorrow : Day
        data class Other(val formatted: String) : Day
    }

    fun day(dt: LocalDateTime, locale: Locale, today: LocalDate = LocalDate.now()): Day {
        val date = dt.toLocalDate()
        return when (date) {
            today -> Day.Today
            today.plusDays(1) -> Day.Tomorrow
            else -> Day.Other(dt.format(DateTimeFormatter.ofPattern("d MMM", locale)))
        }
    }

    /** True when the game starts before the end of today — the "today" chip. */
    fun isToday(dt: LocalDateTime, today: LocalDate = LocalDate.now()): Boolean =
        !dt.toLocalDate().isAfter(today)
}
