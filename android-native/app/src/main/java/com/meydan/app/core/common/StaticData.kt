package com.meydan.app.core.common

/**
 * Static reference data, ported from lib/data.ts.
 *
 * Bundled as constants rather than fetched: onboarding must work on poor
 * connectivity, and a network-fetched district list would block it. These
 * change rarely; when they do, both copies change together.
 */

/** Position enum values, matching Prisma's Position. */
enum class Position { GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD }

/** The eight Ashgabat-area districts, in the same order as the web. */
val DISTRICTS = listOf(
    "Berzengi",
    "Choganly",
    "Parahat",
    "Anev",
    "Buzmeyin",
    "Köpetdag",
    "Bagtyýarlyk",
    "Bagyr",
)

/**
 * Position display metadata. Abbreviations and sub-labels are bilingual, keyed
 * by the app's wire locale ("ru" / "tm"), mirroring POSITIONS in lib/data.ts.
 */
data class PositionInfo(
    val value: Position,
    val abbrRu: String,
    val abbrTm: String,
    val subRu: String,
    val subTm: String,
)

val POSITIONS = listOf(
    PositionInfo(Position.GOALKEEPER, "ВР", "DM", "Под штангой", "Derwezede"),
    PositionInfo(Position.DEFENDER, "ЗАЩ", "GR", "Сзади", "Yzda"),
    PositionInfo(Position.MIDFIELDER, "ПЗ", "ÝG", "В центре", "Merkezde"),
    PositionInfo(Position.FORWARD, "НАП", "HJ", "Впереди", "Öňde"),
)
