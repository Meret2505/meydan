package com.meydan.app.core.common

/**
 * Turkmen phone normalization, ported 1:1 from lib/phone.ts.
 *
 * Kept identical to the server so the client can validate before submitting and
 * show the same result. 8 local digits or an 11-digit 993-prefixed number
 * normalize to +993…; anything else is null (rejected).
 */
fun normalizePhone(input: String): String? {
    val digits = input.filter { it.isDigit() }
    return when {
        digits.length == 8 -> "+993$digits"
        digits.length == 11 && digits.startsWith("993") -> "+$digits"
        else -> null
    }
}
