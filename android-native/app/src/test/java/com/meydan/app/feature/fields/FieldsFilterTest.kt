package com.meydan.app.feature.fields

import com.meydan.app.core.network.dto.FieldCardDto
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The fields search + favorites-first sort, pinned against the web FieldsView
 * behaviour: filter matches localized name OR district, results are favorites
 * first then alphabetic by localized name.
 */
class FieldsFilterTest {

    private fun field(
        id: String,
        nameRu: String,
        nameTm: String = nameRu,
        district: String = "Berzengi",
        favorite: Boolean = false,
        surfaceKey: String? = "ARTIFICIAL",
    ) = FieldCardDto(
        id = id,
        name = nameRu,
        nameRu = nameRu,
        nameTm = nameTm,
        district = district,
        surface = "Искусственная трава",
        surfaceKey = surfaceKey,
        capacity = 12,
        photo = null,
        favorite = favorite,
    )

    @Test
    fun `empty query keeps all, sorted alphabetically`() {
        val result = FieldsViewModel.filterAndSort(
            listOf(field("b", "Байкал"), field("a", "Алем")),
            query = "",
            isTurkmen = false,
        )
        assertEquals(listOf("a", "b"), result.map { it.id })
    }

    @Test
    fun `favorites sort ahead of non-favorites regardless of name`() {
        val result = FieldsViewModel.filterAndSort(
            listOf(field("a", "Алем"), field("z", "Яхта", favorite = true)),
            query = "",
            isTurkmen = false,
        )
        assertEquals(listOf("z", "a"), result.map { it.id })
    }

    @Test
    fun `query matches localized name`() {
        val result = FieldsViewModel.filterAndSort(
            listOf(field("a", "Алем"), field("o", "Олимп")),
            query = "олим",
            isTurkmen = false,
        )
        assertEquals(listOf("o"), result.map { it.id })
    }

    @Test
    fun `query matches district too`() {
        val result = FieldsViewModel.filterAndSort(
            listOf(
                field("a", "Алем", district = "Köpetdag"),
                field("b", "Байкал", district = "Bagtyýarlyk"),
            ),
            query = "bagt",
            isTurkmen = false,
        )
        assertEquals(listOf("b"), result.map { it.id })
    }

    @Test
    fun `turkmen locale searches and displays the tk name`() {
        val f = field("a", nameRu = "Олимп", nameTm = "Olimp")
        // Russian name should NOT match when in Turkmen mode.
        assertEquals(0, FieldsViewModel.filterAndSort(listOf(f), "олимп", isTurkmen = true).size)
        assertEquals(1, FieldsViewModel.filterAndSort(listOf(f), "olimp", isTurkmen = true).size)
        assertEquals("Olimp", FieldsViewModel.displayName(f, isTurkmen = true))
    }

    /**
     * The surface chips filter on the key the server now sends. The Russian
     * label is still on the wire for builds that predate the key, so a card
     * without one has to keep resolving — otherwise the chip silently matches
     * nothing against a server that has not been deployed yet.
     */
    @Test
    fun `surface filters on the key, and falls back to the old label`() {
        val withKey = field("a", "Алем")
        val fromOlderServer = field("b", "Байкал", surfaceKey = null)

        assertEquals("ARTIFICIAL", FieldsViewModel.surfaceKeyOf(withKey))
        assertEquals("ARTIFICIAL", FieldsViewModel.surfaceKeyOf(fromOlderServer))

        val matched = FieldsViewModel.filterAndSort(
            listOf(withKey, fromOlderServer),
            query = "",
            isTurkmen = false,
            surface = "ARTIFICIAL",
        )
        assertEquals(listOf("a", "b"), matched.map { it.id })

        val other = FieldsViewModel.filterAndSort(
            listOf(withKey, fromOlderServer),
            query = "",
            isTurkmen = false,
            surface = "DIRT",
        )
        assertEquals(emptyList<String>(), other.map { it.id })
    }
}
