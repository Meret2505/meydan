package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Test

class LocaleMapperTest {
    @Test
    fun `api tm maps to android tk and back`() {
        assertEquals("tk", LocaleMapper.toAndroidTag("tm"))
        assertEquals("tm", LocaleMapper.toApiLocale("tk"))
        assertEquals("tm", LocaleMapper.toApiLocale("tk-TM"))
    }

    @Test
    fun `russian is unchanged in both directions`() {
        assertEquals("ru", LocaleMapper.toAndroidTag("ru"))
        assertEquals("ru", LocaleMapper.toApiLocale("ru"))
        assertEquals("ru", LocaleMapper.toApiLocale("ru-RU"))
    }

    @Test
    fun `unknown tags fall back to russian, the app default`() {
        assertEquals("ru", LocaleMapper.toApiLocale("en-US"))
    }
}
