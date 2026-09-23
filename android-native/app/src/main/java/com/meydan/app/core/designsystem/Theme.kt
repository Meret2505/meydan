package com.meydan.app.core.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * The app's semantic colour roles.
 *
 * Material 3's own scheme does not have a place for several tokens the brand
 * relies on — two tiers of muted text, two border weights, a second surface
 * layer — so those live here and are provided alongside the MaterialTheme.
 * Components read `MeydanTheme.colors`; MaterialTheme is still populated so
 * stock Material components look right.
 */
@Immutable
data class MeydanColors(
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val navBg: Color,
    val primary: Color,
    val primaryText: Color,
    val primarySoft: Color,
    val warning: Color,
    val danger: Color,
    val text: Color,
    val textSoft: Color,
    val textMuted: Color,
    val border: Color,
    val borderStrong: Color,
    /**
     * The "pitch" hero gradient — stands in for a missing field/team/game photo
     * and always carries white text over a dark scrim, so it stays deep green in
     * both themes rather than following the surface ramp.
     */
    val pitchTop: Color,
    val pitchBottom: Color,
)

private val DarkColors = MeydanColors(
    bg = DarkBg,
    surface = DarkSurface,
    surface2 = DarkSurface2,
    navBg = DarkNavBg,
    primary = DarkPrimary,
    primaryText = DarkPrimaryText,
    primarySoft = DarkPrimarySoft,
    warning = DarkWarning,
    danger = DarkDanger,
    text = DarkText,
    textSoft = DarkTextSoft,
    textMuted = DarkTextMuted,
    border = DarkBorder,
    borderStrong = DarkBorderStrong,
    pitchTop = PitchTop,
    pitchBottom = PitchBottom,
)

private val LightColors = MeydanColors(
    bg = LightBg,
    surface = LightSurface,
    surface2 = LightSurface2,
    navBg = LightNavBg,
    primary = LightPrimary,
    primaryText = LightPrimaryText,
    primarySoft = LightPrimarySoft,
    warning = LightWarning,
    danger = LightDanger,
    text = LightText,
    textSoft = LightTextSoft,
    textMuted = LightTextMuted,
    border = LightBorder,
    borderStrong = LightBorderStrong,
    pitchTop = PitchTop,
    pitchBottom = PitchBottom,
)

private val LocalMeydanColors = staticCompositionLocalOf { DarkColors }

/** Radii from globals.css: 8 / 12 / 16, plus a pill. */
private val MeydanShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(999.dp),
)

object MeydanTheme {
    val colors: MeydanColors
        @Composable get() = LocalMeydanColors.current
}

@Composable
fun MeydanTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors

    // Deliberately no dynamic colour: the green is the brand, and letting
    // Android recolour it from the wallpaper would make the app unrecognisable.
    val material = if (darkTheme) {
        darkColorScheme(
            primary = colors.primary,
            onPrimary = colors.primaryText,
            background = colors.bg,
            onBackground = colors.text,
            surface = colors.surface,
            onSurface = colors.text,
            surfaceVariant = colors.surface2,
            onSurfaceVariant = colors.textMuted,
            error = colors.danger,
            outline = colors.borderStrong,
            outlineVariant = colors.border,
            // Menus, dropdowns, and bottom sheets read these container roles.
            // Without them Material falls back to its purple-tinted baseline
            // neutrals, which look nothing like the brand — so pin them to the
            // app's own surface stack. surfaceTint neutralised so elevated
            // surfaces don't pick up a green wash either.
            surfaceTint = Color.Transparent,
            surfaceBright = DarkSurface2,
            surfaceDim = DarkBg,
            surfaceContainerLowest = Color(0xFF06080B),
            surfaceContainerLow = colors.surface,
            surfaceContainer = Color(0xFF191E26),
            surfaceContainerHigh = colors.surface2,
            surfaceContainerHighest = Color(0xFF262D37),
        )
    } else {
        lightColorScheme(
            primary = colors.primary,
            onPrimary = colors.primaryText,
            background = colors.bg,
            onBackground = colors.text,
            surface = colors.surface,
            onSurface = colors.text,
            surfaceVariant = colors.surface2,
            onSurfaceVariant = colors.textMuted,
            error = colors.danger,
            outline = colors.borderStrong,
            outlineVariant = colors.border,
            surfaceTint = Color.Transparent,
            surfaceBright = Color(0xFFFFFFFF),
            surfaceDim = Color(0xFFE2E5EA),
            surfaceContainerLowest = Color(0xFFFFFFFF),
            surfaceContainerLow = Color(0xFFFAFBFC),
            surfaceContainer = colors.surface,
            surfaceContainerHigh = colors.surface2,
            surfaceContainerHighest = Color(0xFFE6E9EE),
        )
    }

    CompositionLocalProvider(LocalMeydanColors provides colors) {
        MaterialTheme(
            colorScheme = material,
            typography = MeydanTypography,
            shapes = MeydanShapes,
            content = content,
        )
    }
}
