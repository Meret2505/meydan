package com.meydan.app.feature.tournaments

import com.meydan.app.feature.tournaments.TournamentsViewModel.Tab
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The tab filter, pinned against the web tournaments page: cancelled shows
 * under "ended", each live status under its own tab.
 */
class TournamentTabTest {
    @Test
    fun `upcoming tab shows only upcoming`() {
        assertTrue(TournamentsViewModel.inTab("upcoming", Tab.UPCOMING))
        assertFalse(TournamentsViewModel.inTab("ongoing", Tab.UPCOMING))
        assertFalse(TournamentsViewModel.inTab("ended", Tab.UPCOMING))
    }

    @Test
    fun `ongoing tab shows only ongoing`() {
        assertTrue(TournamentsViewModel.inTab("ongoing", Tab.ONGOING))
        assertFalse(TournamentsViewModel.inTab("upcoming", Tab.ONGOING))
    }

    @Test
    fun `ended tab shows ended and cancelled`() {
        assertTrue(TournamentsViewModel.inTab("ended", Tab.ENDED))
        assertTrue(TournamentsViewModel.inTab("cancelled", Tab.ENDED))
        assertFalse(TournamentsViewModel.inTab("upcoming", Tab.ENDED))
        assertFalse(TournamentsViewModel.inTab("ongoing", Tab.ENDED))
    }
}
