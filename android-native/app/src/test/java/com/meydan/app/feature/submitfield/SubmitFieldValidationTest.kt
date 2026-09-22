package com.meydan.app.feature.submitfield

import com.meydan.app.feature.submitfield.SubmitFieldViewModel.RequiredField
import com.meydan.app.feature.submitfield.SubmitFieldViewModel.UiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `missing` is what the form shows the user when the submit button is dead, so
 * it has to agree with `canSubmit` exactly and stay in form order — a button
 * that refuses to light up while every visible input looks filled was the
 * original complaint.
 *
 * The bounds mirror normalizeCreateInput in lib/services/field-submissions.ts.
 */
class SubmitFieldValidationTest {

    private fun valid() = UiState(
        name = "Меydan",
        address = "просп. Махтумкули 16",
        district = "Berzengi",
        surface = "Искусственная трава",
        capacity = "12",
    )

    @Test
    fun `a complete form has nothing missing and can submit`() {
        assertEquals(emptyList<RequiredField>(), valid().missing)
        assertTrue(valid().canSubmit)
    }

    @Test
    fun `an empty form lists every required field in form order`() {
        assertEquals(
            listOf(
                RequiredField.NAME,
                RequiredField.ADDRESS,
                RequiredField.DISTRICT,
                RequiredField.SURFACE,
                RequiredField.CAPACITY,
            ),
            UiState().missing,
        )
    }

    @Test
    fun `an empty capacity is reported, not silently ignored`() {
        // The placeholder reads "12" in grey, so this is the field most easily
        // believed to be filled when it is not.
        val state = valid().copy(capacity = "")
        assertEquals(listOf(RequiredField.CAPACITY), state.missing)
        assertFalse(state.canSubmit)
    }

    @Test
    fun `a capacity outside 4 to 40 is reported`() {
        assertEquals(listOf(RequiredField.CAPACITY), valid().copy(capacity = "3").missing)
        assertEquals(listOf(RequiredField.CAPACITY), valid().copy(capacity = "41").missing)
        assertEquals(emptyList<RequiredField>(), valid().copy(capacity = "4").missing)
        assertEquals(emptyList<RequiredField>(), valid().copy(capacity = "40").missing)
    }

    @Test
    fun `whitespace does not count as a filled name or address`() {
        assertEquals(
            listOf(RequiredField.NAME, RequiredField.ADDRESS),
            valid().copy(name = "  ", address = "   ").missing,
        )
    }

    @Test
    fun `an address under four characters is reported`() {
        assertEquals(listOf(RequiredField.ADDRESS), valid().copy(address = "абв").missing)
    }

    @Test
    fun `phone, description and photos are not required`() {
        val bare = valid().copy(phoneDigits = "", description = "", photos = emptyList())
        assertEquals(emptyList<RequiredField>(), bare.missing)
        assertTrue(bare.canSubmit)
    }

    @Test
    fun `submitting blocks the button without claiming anything is missing`() {
        val state = valid().copy(submitting = true)
        assertEquals(emptyList<RequiredField>(), state.missing)
        assertFalse(state.canSubmit)
    }

    // An input is only marked red once there is something in it to be wrong
    // about: an untouched empty field gets the plain grey requirement instead.
    @Test
    fun `an empty required input is not an error yet`() {
        val empty = UiState()
        assertFalse(empty.nameTooShort)
        assertFalse(empty.addressTooShort)
        assertFalse(empty.capacityOutOfRange)
    }

    @Test
    fun `a started but too short name or address is an error`() {
        assertTrue(valid().copy(name = "М").nameTooShort)
        assertFalse(valid().copy(name = "Ме").nameTooShort)
        assertTrue(valid().copy(address = "абв").addressTooShort)
        assertFalse(valid().copy(address = "абвг").addressTooShort)
    }

    @Test
    fun `whitespace only counts as untouched, not as an error`() {
        assertFalse(valid().copy(name = "   ").nameTooShort)
    }

    @Test
    fun `a capacity outside the range is an error once typed`() {
        assertTrue(valid().copy(capacity = "3").capacityOutOfRange)
        assertTrue(valid().copy(capacity = "41").capacityOutOfRange)
        assertFalse(valid().copy(capacity = "4").capacityOutOfRange)
        assertFalse(valid().copy(capacity = "").capacityOutOfRange)
    }

    private fun photo(name: String) = PickedPhoto(
        previewUri = "content://pick/$name",
        bytes = ByteArray(1),
        mime = "image/jpeg",
        filename = name,
    )

    private fun names(photos: List<PickedPhoto>) = photos.map { it.filename }

    @Test
    fun `a multi-select pick lands in one go`() {
        val after = SubmitFieldViewModel.photosAfterPick(
            existing = emptyList(),
            picked = listOf(photo("a"), photo("b"), photo("c")),
        )
        assertEquals(listOf("a", "b", "c"), names(after))
    }

    @Test
    fun `a pick is trimmed to the three the server accepts`() {
        val after = SubmitFieldViewModel.photosAfterPick(
            existing = listOf(photo("a"), photo("b")),
            picked = listOf(photo("c"), photo("d"), photo("e")),
        )
        assertEquals(listOf("a", "b", "c"), names(after))
    }

    @Test
    fun `picking with the gallery already full changes nothing`() {
        val full = listOf(photo("a"), photo("b"), photo("c"))
        val after = SubmitFieldViewModel.photosAfterPick(full, listOf(photo("d")))
        assertEquals(listOf("a", "b", "c"), names(after))
    }

    @Test
    fun `an added photo leaves the previous list untouched`() {
        val existing = listOf(photo("a"))
        SubmitFieldViewModel.photosAfterPick(existing, listOf(photo("b")))
        assertEquals(listOf("a"), names(existing))
    }
}
