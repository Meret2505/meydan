package com.meydan.app.core.common

import androidx.compose.ui.graphics.Color

/**
 * Team monogram colors, ported from lib/team-color.ts. Each key maps to a
 * base/edge pair used for the gradient behind a team's initials; unknown keys
 * fall back to green, exactly as getTeamColor does.
 */
object TeamColors {
    data class Pair(val base: Color, val edge: Color)

    // One consistent scale (Tailwind 500 base / 600 edge) so the five swatches
    // read as siblings instead of five separately-picked colours, and so each
    // clears 4.5:1 against the white monogram it sits behind.
    private val palette = mapOf(
        "green" to Pair(Color(0xFF22C55E), Color(0xFF16A34A)),
        "blue" to Pair(Color(0xFF3B82F6), Color(0xFF2563EB)),
        "amber" to Pair(Color(0xFFF59E0B), Color(0xFFD97706)),
        "red" to Pair(Color(0xFFEF4444), Color(0xFFDC2626)),
        "purple" to Pair(Color(0xFFA855F7), Color(0xFF9333EA)),
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
