package com.meydan.app.core.designsystem

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Keeps the text sizes to a ladder.
 *
 * The screens set sizes by hand — 198 call sites against 11 named styles in
 * MeydanTypography that almost nothing reads. That is worth fixing properly,
 * and this test is not that fix. It is the thing that stops the ladder
 * drifting further while the fix waits.
 *
 * What it caught first time: five half-point sizes (10.5, 11.5, 12.5, 13.5,
 * 14.5) across 27 call sites. Nobody can tell 13 from 13.5 sp; they exist
 * because someone nudged a number and it stuck, and each one was another value
 * a later migration would have to make a judgement about. They are snapped to
 * whole steps now, and a new fractional size fails here.
 *
 * Reading the sources rather than the UI is deliberate: this is a question
 * about the code, and the answer must not depend on a device being attached.
 * Same approach as R8KeepsDtosTest.
 */
class TypeScaleTest {

    private companion object {
        /**
         * Every size the app uses, and roughly what for. The first seven carry
         * almost everything; the rest are one-offs on single screens that the
         * full migration to named styles will fold in.
         *
         * Adding to this list is meant to be a deliberate edit, not a
         * side effect of writing a screen.
         */
        val ALLOWED = setOf(
            // Workhorses: labels, body, list rows, section titles.
            11, 12, 13, 14, 15, 16, 22,
            // One-offs: captions, headings and the splash figure.
            9, 10, 17, 18, 19, 20, 21, 25, 26, 30, 34, 44,
        )

        val FONT_SIZE = Regex("""fontSize = ([0-9]+(?:\.[0-9]+)?)\.sp""")
    }

    private fun sourceFiles(): List<File> {
        val root = File("src/main/java/com/meydan/app")
        assumeTrue("run from the :app module directory", root.isDirectory)
        return root.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
    }

    @Test
    fun `no fractional text sizes`() {
        val fractional = sourceFiles().flatMap { file ->
            FONT_SIZE.findAll(file.readText())
                .map { it.groupValues[1] }
                .filter { it.contains('.') }
                .map { "${file.name}: ${it}sp" }
        }

        assertEquals(
            "half a point is below anyone's ability to notice and above nobody's " +
                "ability to add — snap these to whole steps",
            emptyList<String>(),
            fractional,
        )
    }

    @Test
    fun `every text size is one the ladder knows about`() {
        val unknown = sourceFiles().flatMap { file ->
            FONT_SIZE.findAll(file.readText())
                .mapNotNull { it.groupValues[1].toDoubleOrNull()?.toInt() }
                .filter { it !in ALLOWED }
                .map { "${file.name}: ${it}sp" }
        }.distinct().sorted()

        assertEquals(
            "a size outside the ladder: either use a neighbouring step or add " +
                "this one to ALLOWED on purpose",
            emptyList<String>(),
            unknown,
        )
    }
}
