package com.meydan.app.core.common

/**
 * Maps between the API's locale code and Android's, in one place.
 *
 * The server speaks "tm" (the country code for Turkmenistan, as the web app has
 * always used). Android resource qualifiers and AppCompat locales need "tk"
 * (the ISO 639-1 language code for Turkmen). Russian is "ru" on both sides.
 *
 * Every boundary crossing goes through here, so the wire format is never in
 * doubt at a call site.
 */
object LocaleMapper {
    /** API code (ru/tm) → Android language tag (ru/tk). */
    fun toAndroidTag(apiLocale: String): String = if (apiLocale == "tm") "tk" else "ru"

    /** Android language tag (ru/tk) → API code (ru/tm). */
    fun toApiLocale(androidTag: String): String =
        if (androidTag.startsWith("tk")) "tm" else "ru"
}
