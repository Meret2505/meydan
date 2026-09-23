package com.meydan.app.core.common

/**
 * How long ago something happened, as a unit and a count.
 *
 * `DateUtils.getRelativeTimeSpanString` was the obvious choice and is the wrong
 * one twice over: the four-argument overload formats in the *system* locale, so
 * a phone set to English showed English timestamps inside an app running in
 * Russian, and the Context overload that does respect the app's locale formats
 * a clock time ("5:12 PM") rather than "8 minutes ago".
 *
 * So the wording comes from our own plurals, which exist in all three
 * languages and give Russian its cases. This part — which unit, and how many —
 * is pure, so the boundaries are unit-tested.
 */
sealed interface RelativeSpan {
    /** Under a minute, or anything in the future (a clock skew, not a claim). */
    data object JustNow : RelativeSpan

    data class Minutes(val count: Int) : RelativeSpan

    data class Hours(val count: Int) : RelativeSpan

    data class Days(val count: Int) : RelativeSpan
}

private const val MINUTE_MS = 60_000L
private const val HOUR_MS = 60 * MINUTE_MS
private const val DAY_MS = 24 * HOUR_MS

fun relativeSpanOf(thenMs: Long, nowMs: Long): RelativeSpan {
    val elapsed = nowMs - thenMs
    return when {
        // A timestamp in the future means the phone's clock disagrees with the
        // server's; "just now" is the honest reading of that.
        elapsed < MINUTE_MS -> RelativeSpan.JustNow
        elapsed < HOUR_MS -> RelativeSpan.Minutes((elapsed / MINUTE_MS).toInt())
        elapsed < DAY_MS -> RelativeSpan.Hours((elapsed / HOUR_MS).toInt())
        else -> RelativeSpan.Days((elapsed / DAY_MS).toInt())
    }
}
