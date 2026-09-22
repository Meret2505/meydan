package com.meydan.app.core.common

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

/**
 * Shrinking a picked photo before it is uploaded.
 *
 * Both pickers used to send the camera's original file: three to ten megabytes
 * for a photo that is displayed in a 96 dp card or a 74 dp avatar. That failed
 * outright above Vercel's ~4.5 MB request limit, held up to three full frames
 * in the submission form's memory at once, and spent minutes of a Turkmen
 * mobile uplink on pixels the server immediately throws away.
 *
 * 1024 px on the longest side at JPEG 85 is comfortably more than the largest
 * place any of these images is shown (a 208 dp detail header on a 3x screen is
 * about 624 px) and lands a typical photo at 100–200 KB.
 */
const val UPLOAD_MAX_SIDE = 1024
private const val UPLOAD_JPEG_QUALITY = 85

/**
 * The power-of-two subsample to decode with: the largest one that still leaves
 * the longest side at or above [maxSide], so the bitmap never has to be
 * upscaled afterwards. This is what keeps a 12 MP frame from being decoded in
 * full (~48 MB of heap) just to be thrown away.
 */
fun sampleSizeFor(width: Int, height: Int, maxSide: Int): Int {
    val longest = maxOf(width, height)
    if (longest <= 0 || maxSide <= 0) return 1
    var sample = 1
    while (longest / (sample * 2) >= maxSide) sample *= 2
    return sample
}

/** Dimensions after fitting the longest side to [maxSide]. Never upscales. */
fun fitWithin(width: Int, height: Int, maxSide: Int): Pair<Int, Int> {
    val longest = maxOf(width, height)
    if (longest <= maxSide || longest <= 0) return width to height
    val scale = maxSide.toDouble() / longest
    // Coerced to at least 1: a very long panorama would otherwise round its
    // short side to zero, which Bitmap.createScaledBitmap rejects.
    return (width * scale).toInt().coerceAtLeast(1) to (height * scale).toInt().coerceAtLeast(1)
}

/**
 * Degrees to rotate for an EXIF orientation tag.
 *
 * Re-encoding drops the tag, so the rotation has to be baked into the pixels —
 * otherwise a portrait photo would upload sideways, which is exactly the kind
 * of regression a "harmless" compression step sneaks in.
 */
fun rotationForExif(orientation: Int): Float = when (orientation) {
    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
    else -> 0f
}

/** A photo ready to upload. */
data class UploadImage(val bytes: ByteArray, val mime: String) {
    // ByteArray in a data class: equals/hashCode would compare references, so
    // they are spelled out rather than left as a trap.
    override fun equals(other: Any?): Boolean =
        other is UploadImage && mime == other.mime && bytes.contentEquals(other.bytes)

    override fun hashCode(): Int = 31 * bytes.contentHashCode() + mime.hashCode()
}

/**
 * Decodes, downscales, straightens and re-encodes [bytes] as JPEG.
 *
 * Returns the original bytes and mime untouched if anything goes wrong —
 * failing to shrink a photo is a reason to try the upload anyway, not a reason
 * to lose the user's pick. Call this off the main thread.
 */
fun compressForUpload(
    bytes: ByteArray,
    mime: String,
    maxSide: Int = UPLOAD_MAX_SIDE,
): UploadImage = runCatching {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return@runCatching null

    val options = BitmapFactory.Options().apply {
        inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, maxSide)
    }
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        ?: return@runCatching null

    val (targetWidth, targetHeight) = fitWithin(decoded.width, decoded.height, maxSide)
    val scaled = if (targetWidth == decoded.width && targetHeight == decoded.height) {
        decoded
    } else {
        Bitmap.createScaledBitmap(decoded, targetWidth, targetHeight, true).also {
            if (it != decoded) decoded.recycle()
        }
    }

    val rotation = rotationForExif(
        ExifInterface(ByteArrayInputStream(bytes))
            .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL),
    )
    val upright = if (rotation == 0f) {
        scaled
    } else {
        Bitmap.createBitmap(
            scaled, 0, 0, scaled.width, scaled.height,
            Matrix().apply { postRotate(rotation) },
            true,
        ).also { if (it != scaled) scaled.recycle() }
    }

    val out = ByteArrayOutputStream()
    upright.compress(Bitmap.CompressFormat.JPEG, UPLOAD_JPEG_QUALITY, out)
    upright.recycle()

    val compressed = out.toByteArray()
    // Guard against the pathological case of a re-encode coming out bigger
    // (an already-optimised small image, say).
    if (compressed.isNotEmpty() && compressed.size < bytes.size) {
        UploadImage(compressed, "image/jpeg")
    } else {
        null
    }
}.getOrNull() ?: UploadImage(bytes, mime)
