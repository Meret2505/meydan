package com.meydan.app.feature.fields

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The hide-on-scroll math for the Fields search + filters block: the offset is
 * negative pixels in -height..0, where 0 is fully shown and -height is fully
 * tucked above the screen. Scroll deltas come straight from the nested-scroll
 * connection — negative when the finger drags the list up (content scrolls
 * down), positive when it comes back.
 */
class FieldsCollapseTest {

    @Test
    fun `scrolling down hides the block`() {
        assertEquals(-30f, collapseOffset(current = 0f, delta = -30f, height = 200f), 0.01f)
    }

    @Test
    fun `hiding stops at the block height`() {
        assertEquals(-200f, collapseOffset(current = -180f, delta = -50f, height = 200f), 0.01f)
    }

    @Test
    fun `scrolling up brings it back`() {
        assertEquals(-150f, collapseOffset(current = -200f, delta = 50f, height = 200f), 0.01f)
    }

    @Test
    fun `revealing stops at fully shown`() {
        assertEquals(0f, collapseOffset(current = -20f, delta = 80f, height = 200f), 0.01f)
    }

    @Test
    fun `unmeasured block never offsets`() {
        assertEquals(0f, collapseOffset(current = 0f, delta = -120f, height = 0f), 0.01f)
    }

    @Test
    fun `a list too short to scroll keeps the block`() {
        assertEquals(
            0f,
            collapseOffset(current = 0f, delta = -80f, height = 200f, listCanScroll = false),
            0.01f,
        )
    }

    @Test
    fun `a short list still lets a hidden block come back`() {
        assertEquals(
            -120f,
            collapseOffset(current = -200f, delta = 80f, height = 200f, listCanScroll = false),
            0.01f,
        )
    }
}
