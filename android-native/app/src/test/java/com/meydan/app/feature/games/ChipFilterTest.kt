package com.meydan.app.feature.games

import com.meydan.app.core.network.dto.GameCardDto
import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The chip filters, pinned against GamesBoard.applyChip's behaviour: 5x5
 * means exactly 10 total spots, the goalie chip matches games needing a
 * GOALKEEPER, today means scheduled before the end of today.
 */
class ChipFilterTest {

    private fun card(
        id: String,
        totalSpots: Int = 12,
        needed: List<String> = emptyList(),
        scheduledAt: LocalDateTime = LocalDateTime.now().plusDays(3),
    ) = GameCardDto(
        id = id,
        scheduledAt = scheduledAt.atZone(ZoneId.systemDefault()).toInstant().toString(),
        venue = "Field",
        district = null,
        format = "6×6",
        totalSpots = totalSpots,
        joinedCount = 3,
        pricePerPlayer = null,
        neededPositions = needed,
        participants = emptyList(),
        mine = false,
    )

    @Test
    fun `no chip returns the list unchanged`() {
        val list = listOf(card("a"), card("b"))
        assertEquals(list, GamesViewModel.applyChip(list, null))
    }

    @Test
    fun `five chip keeps only ten-spot games`() {
        val five = card("five", totalSpots = 10)
        val filtered = GamesViewModel.applyChip(
            listOf(card("a"), five, card("b", totalSpots = 14)),
            GamesViewModel.Chip.FIVE,
        )
        assertEquals(listOf(five), filtered)
    }

    @Test
    fun `goalie chip keeps games that need a goalkeeper`() {
        val needsGoalie = card("g", needed = listOf("GOALKEEPER", "DEFENDER"))
        val filtered = GamesViewModel.applyChip(
            listOf(card("a", needed = listOf("FORWARD")), needsGoalie),
            GamesViewModel.Chip.GOALIE,
        )
        assertEquals(listOf(needsGoalie), filtered)
    }

    @Test
    fun `today chip keeps games scheduled today and drops later ones`() {
        val today = card("t", scheduledAt = LocalDateTime.now().withHour(23).withMinute(0))
        val tomorrow = card("tm", scheduledAt = LocalDateTime.now().plusDays(1))
        val filtered = GamesViewModel.applyChip(
            listOf(today, tomorrow),
            GamesViewModel.Chip.TODAY,
        )
        assertEquals(listOf(today), filtered)
    }
}
