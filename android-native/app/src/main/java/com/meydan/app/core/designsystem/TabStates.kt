package com.meydan.app.core.designsystem

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.meydan.app.R

/**
 * The two states every list tab needs and three of them were missing.
 *
 * Fields, Teams and Tournaments all computed an `offline` flag on a failed
 * refresh and no screen ever read it, so a dead network showed the empty state
 * instead: "nothing found, try changing your search" on a screen that had
 * simply failed to load, with no way to retry. And with an empty cache the
 * tabs rendered a zero-item list — several seconds of blank app on a slow
 * connection, indistinguishable from "there is nothing here".
 */

/**
 * Sits above a list: says the data on screen may be stale, and offers a retry.
 *
 * [savedAt] makes "stale" a number. The app draws its cache immediately and
 * refreshes behind it, so on a dead connection what is on screen is whatever
 * was last stored — and the banner used to say only that, which left a feed
 * from last Tuesday looking exactly like one from a minute ago. Null when the
 * age is unknown (a cache written before this shipped), and the banner falls
 * back to the old wording rather than guessing.
 */
@Composable
fun OfflineBanner(
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    savedAt: Long? = null,
) {
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 6.dp)
            .background(colors.errorContainer, RoundedCornerShape(10.dp))
            .padding(start = 12.dp, end = 4.dp, top = 2.dp, bottom = 2.dp),
    ) {
        Text(
            text = if (savedAt != null) {
                stringResource(R.string.offline_banner_saved, relativeTimeText(savedAt))
            } else {
                stringResource(R.string.offline_banner_generic)
            },
            fontSize = 13.sp,
            color = colors.onErrorContainer,
            modifier = Modifier.weight(1f).padding(vertical = 8.dp),
        )
        TextButton(onClick = onRetry) {
            Text(
                text = stringResource(R.string.common_retry),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.onErrorContainer,
            )
        }
    }
}

/** Fills the list area while the first load is in flight. */
@Composable
fun TabLoading(modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier.fillMaxSize(),
    ) {
        CircularProgressIndicator(
            strokeWidth = 2.5.dp,
            modifier = Modifier.size(26.dp),
            color = MaterialTheme.colorScheme.primary,
        )
    }
}
