package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * A pitch photo is uploaded to be looked at in a 96 dp card and a 208 dp
 * header, and it arrived as whatever the camera produced: three to ten
 * megabytes, which Vercel rejects outright above ~4.5 MB and which the phone
 * has to hold in memory up to three at a time on the submission form.
 *
 * The sampling maths is pure so the decisions are checked here rather than on
 * a device.
 */
class ImageScalingTest {

    @Test
    fun `a photo already small enough is left at full resolution`() {
        assertEquals(1, sampleSizeFor(800, 600, maxSide = 1024))
        assertEquals(1024 to 768, fitWithin(1024, 768, maxSide = 1024))
    }

    @Test
    fun `a 12 megapixel camera photo is subsampled, not decoded in full`() {
        // 4032x3024 is the usual Android 4:3 frame; decoding it whole costs
        // ~48 MB of heap. Halving is as far as this can go: a quarter would
        // leave 1008 px and the final step would have to upscale to 1024,
        // which is how a "compression" step ends up producing a blurrier
        // photo than the one it started with.
        assertEquals(2, sampleSizeFor(4032, 3024, maxSide = 1024))
        assertEquals(8, sampleSizeFor(12000, 9000, maxSide = 1024))
    }

    @Test
    fun `subsampling never overshoots below the target`() {
        // The sample must leave the image at or above the target so the final
        // scale step is a downscale, never an upscale of a too-small bitmap.
        for ((w, h) in listOf(2048 to 1536, 3000 to 4000, 1300 to 900, 5000 to 5000)) {
            val sample = sampleSizeFor(w, h, maxSide = 1024)
            val longest = maxOf(w, h) / sample
            assertEquals(true, longest >= 1024)
        }
    }

    @Test
    fun `the longest side ends up at the limit, keeping the aspect ratio`() {
        assertEquals(1024 to 768, fitWithin(4032, 3024, maxSide = 1024))
        assertEquals(768 to 1024, fitWithin(3024, 4032, maxSide = 1024))
        assertEquals(1024 to 1024, fitWithin(2000, 2000, maxSide = 1024))
    }

    @Test
    fun `a panorama keeps its shape rather than being squared off`() {
        assertEquals(1024 to 256, fitWithin(8000, 2000, maxSide = 1024))
    }

    @Test
    fun `a photo smaller than the limit is never blown up`() {
        assertEquals(400 to 300, fitWithin(400, 300, maxSide = 1024))
    }

    @Test
    fun `degenerate sizes do not crash or produce a zero dimension`() {
        assertEquals(1, sampleSizeFor(0, 0, maxSide = 1024))
        val (w, h) = fitWithin(10000, 1, maxSide = 1024)
        assertEquals(1024, w)
        assertEquals(true, h >= 1)
    }

    @Test
    fun `exif quarter turns map to degrees, anything else to none`() {
        assertEquals(90f, rotationForExif(6))
        assertEquals(180f, rotationForExif(3))
        assertEquals(270f, rotationForExif(8))
        assertEquals(0f, rotationForExif(1))
        assertEquals(0f, rotationForExif(0))
    }
}
