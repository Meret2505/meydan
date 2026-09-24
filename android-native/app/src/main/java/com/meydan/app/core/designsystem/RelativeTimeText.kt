package com.meydan.app.core.designsystem

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import com.meydan.app.core.common.RelativeSpan
import com.meydan.app.core.common.relativeSpanOf
import com.meydan.app.R

/**
 * "5 minutes ago", in the app's language.
 *
 * The wording comes from our own plurals rather than DateUtils, which formats
 * in the *system* locale (English timestamps inside a Russian app) or, in the
 * overload that respects the app's, gives a clock time instead of an elapsed
 * one. See RelativeSpan, where the unit choice lives and is unit-tested; this
 * is only the part that needs a Context.
 *
 * It lived privately inside NotificationsScreen until the offline banner
 * needed the same sentence.
 */
@Composable
fun relativeTimeText(millis: Long): String =
    when (val span = relativeSpanOf(millis, System.currentTimeMillis())) {
        RelativeSpan.JustNow -> stringResource(R.string.time_just_now)
        is RelativeSpan.Minutes ->
            pluralStringResource(R.plurals.time_minutes_ago, span.count, span.count)
        is RelativeSpan.Hours ->
            pluralStringResource(R.plurals.time_hours_ago, span.count, span.count)
        is RelativeSpan.Days ->
            pluralStringResource(R.plurals.time_days_ago, span.count, span.count)
    }
