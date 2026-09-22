package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The card banner used to download the original upload and throw two thirds of
 * it away: 121,787 bytes stored versus 42,046 at w=640&q=75, measured against
 * production. These checks pin the URL the optimizer actually accepts — it
 * rejects a width outside the configured set with a 400.
 */
class ImageUrlTest {

    private val stored =
        "https://meydan-chi.vercel.app/api/storage/field-photos/cmu2feh/1789457760664-38f9a402.jpg"

    @Test
    fun `a proxied photo is routed through the optimizer at the asked width`() {
        assertEquals(
            "https://meydan-chi.vercel.app/_next/image" +
                "?url=%2Fapi%2Fstorage%2Ffield-photos%2Fcmu2feh%2F1789457760664-38f9a402.jpg" +
                "&w=640&q=75",
            optimizedImageUrl(stored, ImageWidth.CARD),
        )
    }

    @Test
    fun `the origin is preserved, so a VPS move needs no change here`() {
        val url = optimizedImageUrl("https://meydan.tm/api/storage/avatars/a/b.png", ImageWidth.AVATAR)
        assertEquals(true, url!!.startsWith("https://meydan.tm/_next/image?url="))
        assertEquals(true, url.endsWith("&w=256&q=75"))
    }

    @Test
    fun `a foreign url is left alone`() {
        val google = "https://lh3.googleusercontent.com/a/ACg8ocK=s96-c"
        assertEquals(google, optimizedImageUrl(google, ImageWidth.AVATAR))
    }

    @Test
    fun `an already optimized url is not wrapped twice`() {
        val once = optimizedImageUrl(stored, ImageWidth.CARD)
        assertEquals(once, optimizedImageUrl(once, ImageWidth.FULL))
    }

    @Test
    fun `null stays null`() {
        assertNull(optimizedImageUrl(null, ImageWidth.CARD))
    }

    @Test
    fun `a space in a path is percent-encoded, never turned into a plus`() {
        // URLEncoder would emit '+', which the optimizer passes upstream as a
        // literal plus and the object then 404s.
        val url = optimizedImageUrl(
            "https://meydan-chi.vercel.app/api/storage/field-photos/old name.jpg",
            ImageWidth.CARD,
        )
        assertEquals(true, url!!.contains("old%20name.jpg"))
    }

    @Test
    fun `non-latin object names survive the round trip`() {
        val url = optimizedImageUrl(
            "https://meydan-chi.vercel.app/api/storage/field-photos/поле.jpg",
            ImageWidth.CARD,
        )
        assertEquals(true, url!!.contains("%D0%BF%D0%BE%D0%BB%D0%B5.jpg"))
    }
}
