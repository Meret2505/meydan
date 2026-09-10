package com.meydan.app.core.designsystem

import androidx.compose.ui.graphics.Color

/**
 * Brand palette.
 *
 * Architecture: **neutral slate surfaces + one confident green accent.**
 * Every surface, border and text tier is a true neutral (slate) — the brand
 * green appears only on primary actions, selected states and success. Tinting
 * the greys with the brand hue (which the earlier palette did) is what made
 * the app read as amateur: a wash of the same green across backgrounds, muted
 * text and borders leaves nothing for the accent to stand out against.
 *
 * These are raw brand tokens. Screens should read them through
 * [MeydanColors] rather than referencing them directly, so switching themes
 * stays a single decision made in Theme.kt.
 */

// ── Dark (the default the app launches in) ────────────────────────────────────
// Surfaces: a 4-step neutral ramp, cool rather than green.
internal val DarkBg = Color(0xFF0A0C10)
internal val DarkSurface = Color(0xFF14181F)
internal val DarkSurface2 = Color(0xFF1E242D)
internal val DarkNavBg = Color(0xFF0C1015)

// Accent: green-500. Reads cleaner and less minty than the old #1FD16B, and
// clears 4.5:1 against DarkBg for text use.
internal val DarkPrimary = Color(0xFF22C55E)
internal val DarkPrimaryText = Color(0xFF052E16)
internal val DarkPrimarySoft = Color(0xFF4ADE80)
internal val DarkWarning = Color(0xFFFBBF24)
internal val DarkDanger = Color(0xFFF87171)

// Text: slate ramp. 4 tiers, each a real step apart so hierarchy is legible.
internal val DarkText = Color(0xFFF8FAFC)
internal val DarkTextSoft = Color(0xFFCBD5E1)
internal val DarkTextMuted = Color(0xFF94A3B8)
internal val DarkTextFaint = Color(0xFF64748B)

internal val DarkBorder = Color(0x14FFFFFF) // rgba(255,255,255,.08)
internal val DarkBorderStrong = Color(0x24FFFFFF) // rgba(255,255,255,.14)

// ── Light ─────────────────────────────────────────────────────────────────────
// Same ramp inverted. bg is a neutral grey, NOT a mint tint, so white cards
// read as raised without the whole page looking green.
internal val LightBg = Color(0xFFF6F7F9)
internal val LightSurface = Color(0xFFFFFFFF)
internal val LightSurface2 = Color(0xFFEFF1F4)
internal val LightNavBg = Color(0xFFFFFFFF)

// green-600 on white clears 4.5:1 for text and button labels.
internal val LightPrimary = Color(0xFF16A34A)
internal val LightPrimaryText = Color(0xFFFFFFFF)
internal val LightPrimarySoft = Color(0xFF15803D)
internal val LightWarning = Color(0xFFD97706)
internal val LightDanger = Color(0xFFDC2626)

internal val LightText = Color(0xFF0F172A)
internal val LightTextSoft = Color(0xFF334155)
internal val LightTextMuted = Color(0xFF64748B)
internal val LightTextFaint = Color(0xFF94A3B8)

internal val LightBorder = Color(0x140F172A) // rgba(15,23,42,.08)
internal val LightBorderStrong = Color(0x240F172A) // rgba(15,23,42,.14)

// ── Shared ────────────────────────────────────────────────────────────────────
// The "pitch" hero: a deep green that stands in for a missing field/team/game
// photo. Theme-independent because it always carries white text over a dark
// scrim — following the surface ramp would make that text illegible in light
// mode. green-800 → green-950, so it reads as the same family as the accent.
internal val PitchTop = Color(0xFF166534)
internal val PitchBottom = Color(0xFF0B3D22)
