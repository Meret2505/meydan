package com.meydan.app.core.designsystem

import androidx.compose.ui.graphics.Color
import kotlin.math.pow
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * WCAG 2.1 contrast, asserted on the palette itself.
 *
 * A contrast failure is invisible to whoever introduced it — the person
 * choosing the colour can read it perfectly on their own screen in their own
 * light. The app shipped its main call to action at 3.30:1 (white on
 * green-600) for exactly that reason, and no amount of looking at it would
 * have said so. So the numbers are asserted here, where changing a colour to
 * something unreadable fails the build instead of the user.
 *
 * AA wants 4.5:1 for body text and 3:1 for large text and for the boundaries
 * of interactive components. Everything checked here carries body text, so
 * 4.5 is the bar.
 */
class ContrastTest {

    private companion object {
        const val AA_BODY = 4.5

        /**
         * A selected chip's label sits on an 8% wash of `primary` over the
         * surface below it — darker than the surface, so it is the binding
         * case for the accent, not white.
         */
        const val CHIP_TINT = 0.08f
    }

    /** sRGB -> linear, per WCAG's relative-luminance definition. */
    private fun channel(c: Float): Double {
        val v = c.toDouble()
        return if (v <= 0.04045) v / 12.92 else ((v + 0.055) / 1.055).pow(2.4)
    }

    private fun luminance(c: Color): Double =
        0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)

    private fun ratio(fg: Color, bg: Color): Double {
        val a = luminance(fg)
        val b = luminance(bg)
        return (maxOf(a, b) + 0.05) / (minOf(a, b) + 0.05)
    }

    /** `fg` at `alpha` over `bg`, the way Compose composites it. */
    private fun over(fg: Color, alpha: Float, bg: Color) = Color(
        red = fg.red * alpha + bg.red * (1 - alpha),
        green = fg.green * alpha + bg.green * (1 - alpha),
        blue = fg.blue * alpha + bg.blue * (1 - alpha),
    )

    private fun assertReadable(name: String, fg: Color, bg: Color) {
        val r = ratio(fg, bg)
        assertTrue(
            "$name is ${"%.2f".format(r)}:1, needs $AA_BODY:1 for body text",
            r >= AA_BODY,
        )
    }

    private val lightSurfaces = listOf(
        "LightBg" to LightBg,
        "LightSurface" to LightSurface,
        "LightSurface2" to LightSurface2,
    )

    private val darkSurfaces = listOf(
        "DarkBg" to DarkBg,
        "DarkSurface" to DarkSurface,
        "DarkSurface2" to DarkSurface2,
    )

    @Test
    fun `every light text tier is readable on every light surface`() {
        val tiers = listOf(
            "LightText" to LightText,
            "LightTextSoft" to LightTextSoft,
            "LightTextMuted" to LightTextMuted,
        )
        for ((fgName, fg) in tiers) {
            for ((bgName, bg) in lightSurfaces) assertReadable("$fgName on $bgName", fg, bg)
        }
    }

    @Test
    fun `every dark text tier is readable on every dark surface`() {
        val tiers = listOf(
            "DarkText" to DarkText,
            "DarkTextSoft" to DarkTextSoft,
            "DarkTextMuted" to DarkTextMuted,
        )
        for ((fgName, fg) in tiers) {
            for ((bgName, bg) in darkSurfaces) assertReadable("$fgName on $bgName", fg, bg)
        }
    }

    @Test
    fun `the primary button's label is readable on the button`() {
        assertReadable("LightPrimaryText on LightPrimary", LightPrimaryText, LightPrimary)
        assertReadable("DarkPrimaryText on DarkPrimary", DarkPrimaryText, DarkPrimary)
    }

    @Test
    fun `the accent is readable as text on its own surfaces`() {
        for ((bgName, bg) in lightSurfaces) {
            assertReadable("LightPrimary as text on $bgName", LightPrimary, bg)
        }
        for ((bgName, bg) in darkSurfaces) {
            assertReadable("DarkPrimary as text on $bgName", DarkPrimary, bg)
        }
    }

    @Test
    fun `a selected chip's label is readable on its own tint`() {
        for ((bgName, bg) in lightSurfaces) {
            assertReadable(
                "LightPrimary on its 8% tint over $bgName",
                LightPrimary,
                over(LightPrimary, CHIP_TINT, bg),
            )
        }
        for ((bgName, bg) in darkSurfaces) {
            assertReadable(
                "DarkPrimary on its 8% tint over $bgName",
                DarkPrimary,
                over(DarkPrimary, CHIP_TINT, bg),
            )
        }
    }

    @Test
    fun `error text is readable, and white is readable on an error fill`() {
        for ((bgName, bg) in lightSurfaces) {
            assertReadable("LightDanger as text on $bgName", LightDanger, bg)
        }
        for ((bgName, bg) in darkSurfaces) {
            assertReadable("DarkDanger as text on $bgName", DarkDanger, bg)
        }
        assertReadable("white on LightDanger", Color.White, LightDanger)
    }

    /**
     * `warning` is knowingly below AA on light surfaces and is not asserted
     * above; see LightWarning's comment for why darkening it would break the
     * favourite star over the pitch hero. Pinned here so the failure is a
     * recorded decision rather than an oversight, and so the number cannot get
     * quietly worse.
     */
    @Test
    fun `warning is the one known shortfall and has not got worse`() {
        val worst = lightSurfaces.minOf { (_, bg) -> ratio(LightWarning, bg) }
        assertTrue("LightWarning improved past AA — assert it properly now", worst < AA_BODY)
        assertTrue(
            "LightWarning fell below 2.8:1 (was 2.82 on LightSurface2)",
            worst >= 2.8,
        )
        for ((bgName, bg) in darkSurfaces) {
            assertReadable("DarkWarning as text on $bgName", DarkWarning, bg)
        }
    }
}
