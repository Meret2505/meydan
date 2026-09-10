package com.meydan.app.core.common

/**
 * Maps between the API's locale code and Android's, in one place.
 *
 * The server speaks "tm" (the country code for Turkmenistan, as the web app has
 * always used). Android resource qualifiers and AppCompat locales need "tk"
 * (the ISO 639-1 language code for Turkmen). Russian is "ru" and English is
 * "en" on both sides.
 *
 * Every boundary crossing goes through here, so the wire format is never in
 * doubt at a call site.
 */
object LocaleMapper {
    /** The three languages the app ships translations for. */
    val supportedAndroidTags: List<String> = listOf("ru", "tk", "en")

    /** API code (ru/tm/en) → Android language tag (ru/tk/en). */
    fun toAndroidTag(apiLocale: String): String = when (apiLocale) {
        "tm" -> "tk"
        "en" -> "en"
        else -> "ru"
    }

    /** Android language tag (ru/tk/en) → API code (ru/tm/en). */
    fun toApiLocale(androidTag: String): String = when {
        androidTag.startsWith("tk") -> "tm"
        androidTag.startsWith("en") -> "en"
        else -> "ru"
    }

    // First-launch resolution: no explicit call needed. AppCompatDelegate's
    // per-app language starts empty, so Android's resource loader picks the
    // best fit from res/values{,-en,-tk}/ based on the device locale — devices
    // in English land on English, in Turkmen on Turkmen, anything else on
    // Russian (the default in unqualified values/). Only when the user picks
    // something via the profile sheet does setApplicationLocales pin a choice.
}
