package com.meydan.app.core.common

import androidx.compose.ui.graphics.Color

/**
 * Team monogram colors, ported from lib/team-color.ts. Each key maps to a
 * base/edge pair used for the gradient behind a team's initials; unknown keys
 * fall back to green, exactly as getTeamColor does.
 */
object TeamColors {
    data class Pair(val base: Color, val edge: Color)

    private val palette = mapOf(
        "green" to Pair(Color(0xFF1FD16B), Color(0xFF14A955)),
        "blue" to Pair(Color(0xFF6FB1E0), Color(0xFF3D89C2)),
        "amber" to Pair(Color(0xFFF2B53C), Color(0xFFC58F1E)),
        "red" to Pair(Color(0xFFE0556A), Color(0xFFB23B4E)),
        "purple" to Pair(Color(0xFF9B8FE0), Color(0xFF6E62B7)),
    )

    private val default = palette.getValue("green")

    fun of(key: String?): Pair = palette[key] ?: default

    /** Up to two initials from a team name, matching the web monogram. */
    fun monogram(name: String): String =
        name.trim().split(Regex("\\s+"))
            .filter { it.isNotEmpty() }
            .take(2)
            .joinToString("") { it.first().uppercase() }
            .ifEmpty { "?" }
}
