package com.meydan.app.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * A link arrives from outside the app, so it is whatever someone pasted:
 * another locale, a trailing slash, a query string, a different app's scheme,
 * or nothing like a link at all. The parser has to answer for all of it
 * without ever putting junk into a navigation route.
 */
class DeepLinkTest {

    private val id = "clx9a7b2c0000abcd1234efgh"

    @Test
    fun `a web link opens the screen it points at`() {
        // These are exactly what notificationHref builds in
        // lib/notification-routing.ts, so one of those hrefs is a deep link.
        val base = "https://meydan-chi.vercel.app/ru"
        assertEquals(DeepLink.Game(id), deepLinkOf("$base/games/$id"))
        assertEquals(DeepLink.Field(id), deepLinkOf("$base/fields/$id"))
        assertEquals(DeepLink.Team(id), deepLinkOf("$base/teams/$id"))
        assertEquals(DeepLink.Tournament(id), deepLinkOf("$base/tournaments/$id"))
        assertEquals(DeepLink.Notifications, deepLinkOf("$base/notifications"))
    }

    @Test
    fun `the locale segment does not matter, and may be missing`() {
        // "tm" is what the server writes, "tk" what Android calls the same
        // language; a link can come from either side.
        for (prefix in listOf("/ru", "/tm", "/tk", "/en", "")) {
            assertEquals(
                "locale '$prefix'",
                DeepLink.Game(id),
                deepLinkOf("https://meydan-chi.vercel.app$prefix/games/$id"),
            )
        }
    }

    @Test
    fun `the app's own scheme works too`() {
        // The authority slot holds "games" here, not a host — the case that
        // makes hand-parsing worth a test.
        assertEquals(DeepLink.Game(id), deepLinkOf("meydan://games/$id"))
        assertEquals(DeepLink.Notifications, deepLinkOf("meydan://notifications"))
    }

    @Test
    fun `trailing slashes and query strings are ignored`() {
        assertEquals(DeepLink.Game(id), deepLinkOf("https://meydan-chi.vercel.app/ru/games/$id/"))
        assertEquals(
            DeepLink.Game(id),
            deepLinkOf("https://meydan-chi.vercel.app/ru/games/$id?from=whatsapp"),
        )
    }

    @Test
    fun `http is accepted as well as https`() {
        // Not every link that reaches a phone has been upgraded.
        assertEquals(DeepLink.Game(id), deepLinkOf("http://meydan-chi.vercel.app/ru/games/$id"))
    }

    @Test
    fun `a list page is not a deep link`() {
        // It resolves to a tab, not a screen; the app opens where it normally
        // would rather than guessing.
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/games"))
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/teams"))
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/profile"))
    }

    @Test
    fun `an unknown section is not a deep link`() {
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/players/$id"))
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/games/$id/result"))
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/privacy"))
    }

    @Test
    fun `another app's scheme is refused`() {
        assertNull(deepLinkOf("fb://games/$id"))
        assertNull(deepLinkOf("meydanx://games/$id"))
    }

    @Test
    fun `an id that is not one is refused`() {
        // A route pattern is not the place to discover that an id is junk.
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/games/../../etc/passwd"))
        assertNull(deepLinkOf("https://meydan-chi.vercel.app/ru/games/${"x".repeat(65)}"))
        assertNull(deepLinkOf("meydan://games/a b"))
    }

    @Test
    fun `nothing at all is not a link`() {
        assertNull(deepLinkOf(null))
        assertNull(deepLinkOf(""))
        assertNull(deepLinkOf("   "))
        assertNull(deepLinkOf("not a url"))
        assertNull(deepLinkOf("/ru/games/$id")) // no scheme
    }

    @Test
    fun `every link maps to a route the nav graph declares`() {
        // The routes are built by the same helpers the NavHost registers, so a
        // renamed route breaks here rather than at a tap.
        assertEquals("game/$id", DeepLink.Game(id).route())
        assertEquals("field/$id", DeepLink.Field(id).route())
        assertEquals("team/$id", DeepLink.Team(id).route())
        assertEquals("tournament/$id", DeepLink.Tournament(id).route())
        assertEquals(Routes.NOTIFICATIONS, DeepLink.Notifications.route())
    }
}
