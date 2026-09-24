package com.meydan.app.navigation

import java.net.URI

/**
 * A screen a link from outside the app can open.
 *
 * Until now nothing could: the only way in was the launcher icon, so a game
 * link shared in WhatsApp — which is how anything gets shared here — opened
 * the website in a browser even on a phone with the app installed, and a push
 * notification (when those land) would have had nowhere to send anyone.
 */
sealed interface DeepLink {
    data class Game(val id: String) : DeepLink

    data class Field(val id: String) : DeepLink

    data class Team(val id: String) : DeepLink

    data class Tournament(val id: String) : DeepLink

    data object Notifications : DeepLink
}

/**
 * The link shapes accepted, matching the web app's own URLs so that a link
 * copied from the site opens the app:
 *
 *     https://meydan-chi.vercel.app/ru/games/<id>
 *     https://meydan-chi.vercel.app/games/<id>     (locale omitted)
 *     meydan://games/<id>
 *
 * and the same for `fields`, `teams`, `tournaments`, plus `/notifications`.
 * The web paths are the ones notificationHref builds in lib/notification-routing.ts;
 * they are the same strings on purpose, so one of those hrefs *is* a deep link.
 *
 * Anything else — a list page, the profile, an unknown path, junk — returns
 * null and the app opens where it normally would. A link is a shortcut, never
 * the only way to get somewhere, so failing to understand one is not an error
 * worth showing anybody.
 *
 * Pure, and it avoids android.net.Uri so the parsing is unit-tested rather
 * than trusted.
 */
fun deepLinkOf(url: String?): DeepLink? {
    if (url.isNullOrBlank()) return null
    val uri = runCatching { URI(url) }.getOrNull() ?: return null
    val scheme = uri.scheme?.lowercase() ?: return null

    val segments = when (scheme) {
        // http(s)://host/a/b — the authority is not part of the path.
        "http", "https" -> uri.path.orEmpty().split('/')
        // meydan://games/<id> parses "games" as the authority, so it has to be
        // put back in front of the path to read as one list of segments.
        "meydan" -> listOf(uri.host.orEmpty()) + uri.path.orEmpty().split('/')
        else -> return null
    }.filter { it.isNotBlank() }.let(::withoutLocale)

    return when {
        segments.size == 2 && isId(segments[1]) -> when (segments[0]) {
            "games" -> DeepLink.Game(segments[1])
            "fields" -> DeepLink.Field(segments[1])
            "teams" -> DeepLink.Team(segments[1])
            "tournaments" -> DeepLink.Tournament(segments[1])
            else -> null
        }
        segments == listOf("notifications") -> DeepLink.Notifications
        else -> null
    }
}

/**
 * The web app's paths carry a locale segment; the app's own screens do not
 * care which one, since the language is a device setting. "tk" as well as
 * "tm" because that is the split LocaleMapper exists for — the server writes
 * "tm", Android calls the same language "tk", and a link could come from
 * either side.
 */
private val LOCALES = setOf("ru", "tm", "tk", "en")

private fun withoutLocale(segments: List<String>): List<String> =
    if (segments.firstOrNull()?.lowercase() in LOCALES) segments.drop(1) else segments

/**
 * A cuid, as Prisma generates. Checked so a malformed link cannot push
 * arbitrary text into a navigation route — the screen behind it would only
 * report "not found", but the route pattern is not the place to find that out.
 */
private fun isId(segment: String): Boolean =
    segment.length in 1..64 && segment.all { it.isLetterOrDigit() || it == '-' || it == '_' }

/** The in-app route this link opens. */
fun DeepLink.route(): String = when (this) {
    is DeepLink.Game -> Routes.gameDetail(id)
    is DeepLink.Field -> Routes.fieldDetail(id)
    is DeepLink.Team -> Routes.teamDetail(id)
    is DeepLink.Tournament -> Routes.tournamentDetail(id)
    DeepLink.Notifications -> Routes.NOTIFICATIONS
}
