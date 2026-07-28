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
    ) = FieldCardDto(
        id = id,
        name = nameRu,
        nameRu = nameRu,
        nameTm = nameTm,
        district = district,
        surface = "Искусственная трава",
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
}
