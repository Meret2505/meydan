package com.meydan.app.feature.gamedetail

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The write-up form's own rules, kept pure so they can be checked without a
 * device. The score is optional — attendance alone is a valid write-up, and it
 * is the half the reliability ratings are built from — but half a score is not
 * a result, so the form refuses it rather than letting the server do it.
 */
class ResultDraftTest {

    private val roster = listOf("a", "b", "c")

    @Test
    fun `everyone starts marked as present`() {
        // The common case by far: the organizer confirms rather than fills in.
        val draft = ResultDraft.forRoster(roster)
        assertEquals(mapOf("a" to true, "b" to true, "c" to true), draft.attended)
        assertTrue(draft.canSubmit)
    }

    @Test
    fun `an absence is recorded`() {
        val draft = ResultDraft.forRoster(roster).toggle("b")
        assertEquals(false, draft.attended["b"])
        assertEquals(true, draft.attended["a"])
    }

    @Test
    fun `a toggle is reversible`() {
        val draft = ResultDraft.forRoster(roster).toggle("b").toggle("b")
        assertEquals(true, draft.attended["b"])
    }

    @Test
    fun `attendance with no score is submittable`() {
        val draft = ResultDraft.forRoster(roster)
        assertTrue(draft.canSubmit)
        assertNull(draft.homeScore)
        assertNull(draft.awayScore)
    }

    @Test
    fun `a full score is submittable`() {
        val draft = ResultDraft.forRoster(roster).withScores("3", "2")
        assertTrue(draft.canSubmit)
        assertEquals(3, draft.homeScore)
        assertEquals(2, draft.awayScore)
    }

    @Test
    fun `half a score blocks the button`() {
        assertFalse(ResultDraft.forRoster(roster).withScores("3", "").canSubmit)
        assertFalse(ResultDraft.forRoster(roster).withScores("", "1").canSubmit)
    }

    @Test
    fun `a nil-nil draw is a real result`() {
        val draft = ResultDraft.forRoster(roster).withScores("0", "0")
        assertTrue(draft.canSubmit)
        assertEquals(0, draft.homeScore)
    }

    @Test
    fun `score input keeps only digits and stays two characters`() {
        val draft = ResultDraft.forRoster(roster).withScores("1x2", "999")
        assertEquals("12", draft.home)
        assertEquals("99", draft.away)
    }

    @Test
    fun `an empty roster with no score has nothing to submit`() {
        assertFalse(ResultDraft.forRoster(emptyList()).canSubmit)
        assertTrue(ResultDraft.forRoster(emptyList()).withScores("1", "0").canSubmit)
    }
}
