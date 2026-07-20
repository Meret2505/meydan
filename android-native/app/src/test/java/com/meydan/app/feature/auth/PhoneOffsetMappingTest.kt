package com.meydan.app.feature.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The visual transformation shows "65123456" as "65 12 34 56". An offset
 * mapping that steps outside the transformed text, or is not a proper inverse,
 * throws inside the text field at runtime — so the invariants are pinned here
 * for every possible digit count and cursor position.
 */
class PhoneOffsetMappingTest {

    private fun transformed(digits: String) = digits.chunked(2).joinToString(" ")

    @Test
    fun `original offsets land inside the transformed text for all lengths`() {
        for (len in 0..8) {
            val digits = "65123456".take(len)
            val shown = transformed(digits)
            for (o in 0..len) {
                val t = phoneOriginalToTransformed(o)
                assertTrue(
                    "len=$len o=$o -> t=$t out of 0..${shown.length}",
                    t in 0..shown.length,
                )
            }
        }
    }

    @Test
    fun `transformed offsets map back inside the original for all lengths`() {
        for (len in 0..8) {
            val digits = "65123456".take(len)
            val shown = transformed(digits)
            for (t in 0..shown.length) {
                val o = phoneTransformedToOriginal(t)
                assertTrue(
                    "len=$len t=$t -> o=$o out of 0..$len",
                    o in 0..len,
                )
            }
        }
    }

    @Test
    fun `round trip from original is the identity`() {
        for (o in 0..8) {
            assertEquals(o, phoneTransformedToOriginal(phoneOriginalToTransformed(o)))
        }
    }

    @Test
    fun `spot checks against the rendered string`() {
        // "65 12 34 56": cursor after 4 digits sits after "65 12" (index 5).
        assertEquals(5, phoneOriginalToTransformed(4))
        // End of 8 digits is the end of the 11-char transformed string.
        assertEquals(11, phoneOriginalToTransformed(8))
        // Clicking right after the first space (index 3) puts the cursor at
        // digit 2.
        assertEquals(2, phoneTransformedToOriginal(3))
        assertEquals(8, phoneTransformedToOriginal(11))
    }
}
