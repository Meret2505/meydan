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
    fun `english maps straight through, in both directions`() {
        // This test used to assert that "en-US" fell back to Russian, which was
        // true before the app shipped English. It has been failing ever since,
        // and behind it sat a real mismatch: the server's onboarding validator
        // still rejected "en", so an English user's profile save came back
        // invalid_input. Both sides now agree on ru / tm / en.
        assertEquals("en", LocaleMapper.toApiLocale("en-US"))
        assertEquals("en", LocaleMapper.toApiLocale("en"))
        assertEquals("en", LocaleMapper.toAndroidTag("en"))
    }

    @Test
    fun `a language the app does not ship falls back to russian`() {
        assertEquals("ru", LocaleMapper.toApiLocale("de-DE"))
        assertEquals("ru", LocaleMapper.toAndroidTag("fr"))
    }
}
