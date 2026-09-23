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

// Text: slate ramp (50 / 300 / 400), each a real step apart so hierarchy is
// legible. Every tier clears 4.5:1 on all three dark surfaces — the lightest
// surface, DarkSurface2, is the binding one: 18.71 / 13.18 / 6.09.
internal val DarkText = Color(0xFFF8FAFC)
internal val DarkTextSoft = Color(0xFFCBD5E1)
internal val DarkTextMuted = Color(0xFF94A3B8)

internal val DarkBorder = Color(0x14FFFFFF) // rgba(255,255,255,.08)
internal val DarkBorderStrong = Color(0x24FFFFFF) // rgba(255,255,255,.14)

// ── Light ─────────────────────────────────────────────────────────────────────
// Same ramp inverted. bg is a neutral grey, NOT a mint tint, so white cards
// read as raised without the whole page looking green.
internal val LightBg = Color(0xFFF6F7F9)
internal val LightSurface = Color(0xFFFFFFFF)
internal val LightSurface2 = Color(0xFFEFF1F4)
internal val LightNavBg = Color(0xFFFFFFFF)

// green-800, not the green-600 this used to be — and not because green-600 is
// the wrong green, but because on a light ground it cannot carry text or a
// white label. Measured against LightBg / LightSurface / LightSurface2:
//
//   green-600 #16A34A   as text  3.07 / 3.30 / 2.91   white on it  3.30
//   green-800 #166534   as text  6.65 / 7.13 / 6.30   white on it  7.13
//
// The 3.30 was the app's primary call to action — white on green, the most
// pressed button in the product — sitting a third below the 4.5:1 that body
// text needs. `primary` is also the label colour in 19 places and the text on
// every selected chip (over an 8% tint of itself, which is darker still: 5.62
// at green-800, 3.02 at green-600), so one token had to answer for all of it.
//
// Dark mode keeps the vivid #22C55E: on #0A0C10 it already measures 8.59. The
// brand therefore reads as vivid green on dark and deep green on light, which
// is the same direction every accent has to move when the ground flips.
internal val LightPrimary = Color(0xFF166534)
internal val LightPrimaryText = Color(0xFFFFFFFF)

/** green-700: lighter than [LightPrimary], mirroring PrimarySoft in dark mode. */
internal val LightPrimarySoft = Color(0xFF15803D)

/**
 * amber-600, and knowingly under AA as text (2.82–3.19 on the light surfaces).
 *
 * It is not darkened here because this token does two jobs: a text colour on
 * light surfaces, and the tint of the favourite star drawn over the dark pitch
 * hero, where an amber-800 would vanish. Splitting the role is the fix; it
 * belongs with the wider colour cleanup, not with a one-line edit that trades
 * one contrast failure for another.
 */
internal val LightWarning = Color(0xFFD97706)

/** red-700: as text 5.72 on the worst light surface, 6.47 for white on it. */
internal val LightDanger = Color(0xFFB91C1C)

// Text: the same slate ramp as dark mode, inverted, shifted one step darker
// than it was (900 / 700 / 600). slate-500 as `muted` measured 4.21 on
// LightSurface2 and 4.44 on LightBg, and `muted` is wired to M3's
// onSurfaceVariant — every section label, placeholder and hint in the app — so
// that one value was most of the app's secondary text. slate-600 is 6.70 at
// worst.
internal val LightText = Color(0xFF0F172A)
internal val LightTextSoft = Color(0xFF334155)
internal val LightTextMuted = Color(0xFF475569)

internal val LightBorder = Color(0x140F172A) // rgba(15,23,42,.08)
internal val LightBorderStrong = Color(0x240F172A) // rgba(15,23,42,.14)

// ── Shared ────────────────────────────────────────────────────────────────────
// The "pitch" hero: a deep green that stands in for a missing field/team/game
// photo. Theme-independent because it always carries white text over a dark
// scrim — following the surface ramp would make that text illegible in light
// mode. green-800 → green-950, so it reads as the same family as the accent.
internal val PitchTop = Color(0xFF166534)
internal val PitchBottom = Color(0xFF0B3D22)
