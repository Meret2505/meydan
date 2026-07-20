package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Mirrors the lib/phone.ts cases so client and server normalize identically.
 */
class PhoneTest {
    @Test
    fun `eight local digits get the country code`() {
        assertEquals("+99365123456", normalizePhone("65123456"))
    }

    @Test
    fun `formatting characters are stripped`() {
        assertEquals("+99365123456", normalizePhone("65 12 34 56"))
        assertEquals("+99365123456", normalizePhone("+993 65 123456"))
    }

    @Test
    fun `eleven digits with 993 prefix normalize`() {
        assertEquals("+99365123456", normalizePhone("99365123456"))
    }

    @Test
    fun `wrong lengths are rejected`() {
        assertNull(normalizePhone("6512345"))      // 7 digits
        assertNull(normalizePhone("651234567"))    // 9 digits
        assertNull(normalizePhone(""))
        assertNull(normalizePhone("abc"))
    }

    @Test
    fun `eleven digits without 993 prefix are rejected`() {
        assertNull(normalizePhone("12345678901"))
    }
}
