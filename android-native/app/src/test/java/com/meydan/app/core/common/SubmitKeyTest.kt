package com.meydan.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/**
 * The two properties the whole idempotency scheme rests on, from the client's
 * side: a retry of one submit repeats the key, and a genuinely new submit does
 * not. Get the first wrong and a lost response becomes a duplicate game; get
 * the second wrong and two teams someone meant to create collapse into one.
 */
class SubmitKeyTest {

    /** Counts calls, so "minted once" is observable rather than inferred. */
    private class Counter {
        var mints = 0
        fun mint(): String = "key-${++mints}"
    }

    @Test
    fun `every retry of one submit sends the same key`() {
        val counter = Counter()
        val key = SubmitKey(counter::mint)

        val attempts = List(4) { key.forAttempt() }

        assertEquals(listOf("key-1", "key-1", "key-1", "key-1"), attempts)
        assertEquals(1, counter.mints)
    }

    @Test
    fun `the next submit after a success gets a new key`() {
        val counter = Counter()
        val key = SubmitKey(counter::mint)

        val first = key.forAttempt()
        key.spent()
        val second = key.forAttempt()

        assertNotEquals(first, second)
        assertEquals(2, counter.mints)
    }

    @Test
    fun `the real keys are distinct`() {
        // The default mint is UUID.randomUUID; a shared or empty value would
        // make two people's submits collide on the server.
        val keys = List(100) { SubmitKey().forAttempt() }

        assertEquals(100, keys.toSet().size)
        // The server rejects anything under 8 characters or with whitespace
        // (see lib/api/idempotency.ts), so the client must not produce one.
        assertEquals(emptyList<String>(), keys.filter { it.length < 8 || it.any(Char::isWhitespace) })
    }
}
