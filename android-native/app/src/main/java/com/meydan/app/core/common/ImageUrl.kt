package com.meydan.app.core.common

/**
 * Widths to ask the backend's image optimizer for.
 *
 * Only values Next.js is configured to serve are allowed (its `deviceSizes`
 * and `imageSizes`); anything else is rejected with a 400, so these are
 * constants rather than a computed pixel size.
 */
object ImageWidth {
    /** Profile and roster avatars, up to ~85 dp at 3x. */
    const val AVATAR = 256

    /** List-card banners, which are full screen width. */
    const val CARD = 640

    /** Detail headers and anything shown full screen. */
    const val FULL = 1080
}

private const val STORAGE_MARKER = "/api/storage/"

/**
 * Routes a proxied storage image through the backend's image optimizer at a
 * given width.
 *
 * The app was handing Coil the original upload for a 96 dp card banner: one
 * measured pitch photo is 121,787 bytes as stored and 42,046 bytes at
 * `w=640&q=75` — two thirds of the bytes thrown away after download, per card,
 * on the slowest connections the app runs on.
 *
 * Only our own `/api/storage/` URLs are rewritten. Anything else (a Google
 * account avatar, an already-optimized URL, a null) is returned untouched, so
 * this is safe to apply at every call site.
 */
fun optimizedImageUrl(url: String?, width: Int): String? {
    if (url == null) return null
    val marker = url.indexOf(STORAGE_MARKER)
    if (marker == -1 || url.contains("/_next/image")) return url

    val origin = url.take(marker)
    val path = url.substring(marker)
    return "$origin/_next/image?url=${encodeQueryValue(path)}&w=$width&q=75"
}

/**
 * Percent-encodes a path for use as a query value. Deliberately hand-rolled:
 * `URLEncoder` encodes a space as `+`, which the optimizer would hand back as a
 * literal plus in the upstream path.
 */
private fun encodeQueryValue(value: String): String = buildString(value.length * 3) {
    for (byte in value.toByteArray(Charsets.UTF_8)) {
        val c = byte.toInt().toChar()
        if (c.isLetterOrDigit() && c.code < 128 || c in "-_.~") append(c)
        else append('%').append("%02X".format(byte))
    }
}
