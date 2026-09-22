package com.meydan.app.core.network

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Guards a release-only failure mode that debug builds cannot show.
 *
 * Retrofit picks its converter from the method's generic signature. A response
 * DTO whose fields the app never reads (the avatar URL, say — the repository
 * re-fetches /me instead) looks unused to R8, which deletes it and degrades the
 * signature to `ApiResponse<Object>`. kotlinx.serialization then has no
 * serializer for `Object` and throws before a single byte goes out, which
 * `apiCall` reports as `NetworkError` — the UI says "no connection" for a call
 * that never left the phone.
 *
 * R8 writes every class it removed to usage.txt, so the shrunk build is asked
 * directly rather than mocked. Only meaningful after `assembleRelease`.
 */
class R8KeepsDtosTest {

    @Test
    fun `release build keeps every network DTO`() {
        // app/build/... — the unit test's working directory is the module.
        val usage = File("build/outputs/mapping/release/usage.txt")
        assumeTrue("no release build to inspect; run :app:assembleRelease", usage.isFile)

        val removed = usage.readLines()
            .filter { it.startsWith("com.meydan.app.core.network.dto.") && !it.contains(":") }
            .map { it.substringAfterLast('.') }
            .sorted()

        assertEquals("R8 shrunk these DTOs out of the release build", emptyList<String>(), removed)
    }
}
