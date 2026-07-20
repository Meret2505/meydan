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
 * relies on — three tiers of muted text, two border weights, a second surface
 * layer — so those live here and are provided alongside the MaterialTheme.
 * Components read `MeydanTheme.colors`; MaterialTheme is still populated so
 * stock Material components look right.
 */
@Immutable
data class MeydanColors(
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val primary: Color,
    val primaryText: Color,
    val primarySoft: Color,
    val warning: Color,
    val danger: Color,
    val text: Color,
    val textSoft: Color,
    val textMuted: Color,
    val textFaint: Color,
    val border: Color,
    val borderStrong: Color,
)

private val DarkColors = MeydanColors(
    bg = DarkBg,
    surface = DarkSurface,
    surface2 = DarkSurface2,
    primary = DarkPrimary,
    primaryText = DarkPrimaryText,
    primarySoft = DarkPrimarySoft,
    warning = DarkWarning,
    danger = DarkDanger,
    text = DarkText,
    textSoft = DarkTextSoft,
    textMuted = DarkTextMuted,
    textFaint = DarkTextFaint,
    border = DarkBorder,
    borderStrong = DarkBorderStrong,
)

private val LightColors = MeydanColors(
    bg = LightBg,
    surface = LightSurface,
    surface2 = LightSurface2,
    primary = LightPrimary,
    primaryText = LightPrimaryText,
    primarySoft = LightPrimarySoft,
    warning = LightWarning,
    danger = LightDanger,
    text = LightText,
    textSoft = LightTextSoft,
    textMuted = LightTextMuted,
    textFaint = LightTextFaint,
    border = LightBorder,
    borderStrong = LightBorderStrong,
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
