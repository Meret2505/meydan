package com.meydan.app.core.designsystem

import androidx.compose.ui.graphics.Color

/**
 * Brand palette, ported verbatim from the web app's CSS custom properties in
 * app/globals.css. Both themes ship because the web app has a theme toggle and
 * users expect the same choice here.
 *
 * These are raw brand tokens. Screens should read them through
 * [MeydanColors] rather than referencing them directly, so switching themes
 * stays a single decision made in Theme.kt.
 */

// Dark (the default the app launches in)
internal val DarkBg = Color(0xFF0B0E0D)
internal val DarkSurface = Color(0xFF13181A)
internal val DarkSurface2 = Color(0xFF1B2123)
internal val DarkNavBg = Color(0xFF0E1312) // globals.css --nav-bg
internal val DarkPrimary = Color(0xFF1FD16B)
internal val DarkPrimaryText = Color(0xFF06210F)
internal val DarkPrimarySoft = Color(0xFF5BE39A)
internal val DarkWarning = Color(0xFFF2B53C)
internal val DarkDanger = Color(0xFFE0556A)
internal val DarkText = Color(0xFFF2F5F3)
internal val DarkTextSoft = Color(0xFFC7CEC9)
internal val DarkTextMuted = Color(0xFF8A938E)
internal val DarkTextFaint = Color(0xFF5F665F)
internal val DarkBorder = Color(0x14FFFFFF) // rgba(255,255,255,.08)
internal val DarkBorderStrong = Color(0x1FFFFFFF) // rgba(255,255,255,.12)

// Light
internal val LightBg = Color(0xFFF5F7F5)
internal val LightSurface = Color(0xFFFFFFFF)
internal val LightSurface2 = Color(0xFFEDF1EE)
internal val LightNavBg = Color(0xFFFFFFFF) // globals.css --nav-bg
internal val LightPrimary = Color(0xFF14A85A)
internal val LightPrimaryText = Color(0xFFFFFFFF)
internal val LightPrimarySoft = Color(0xFF0D8A47)
internal val LightWarning = Color(0xFFC48A15)
internal val LightDanger = Color(0xFFC13548)
internal val LightText = Color(0xFF0B1410)
internal val LightTextSoft = Color(0xFF2E3A34)
internal val LightTextMuted = Color(0xFF626E67)
internal val LightTextFaint = Color(0xFF97A19A)
internal val LightBorder = Color(0x1A0B1410) // rgba(11,20,16,.10)
internal val LightBorderStrong = Color(0x290B1410) // rgba(11,20,16,.16)
