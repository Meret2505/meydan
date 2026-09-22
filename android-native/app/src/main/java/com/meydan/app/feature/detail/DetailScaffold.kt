package com.meydan.app.feature.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.meydan.app.R

/** A circular translucent back button, reused across all detail screens. */
@Composable
fun DetailBackButton(onBack: () -> Unit, modifier: Modifier = Modifier, onDark: Boolean = false) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            // 48 dp is Material's minimum touch target; this was 40, on the
            // only way back out of a full-screen photo header.
            .size(48.dp)
            .clip(CircleShape)
            .background(
                if (onDark) Color.Black.copy(alpha = 0.45f)
                else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
            )
            .clickable(onClick = onBack),
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = stringResource(R.string.common_back),
            tint = if (onDark) Color.White else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(22.dp),
        )
    }
}

/**
 * Wraps a detail screen's loading and error states so the three detail screens
 * share one behaviour: a spinner while loading, a retry on error (with a back
 * button always reachable), and the content once data is present.
 */
@Composable
fun DetailStateBox(
    loading: Boolean,
    error: Boolean,
    hasData: Boolean,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            hasData -> content()
            loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            error -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
            ) {
                Text(stringResource(R.string.error_generic_title))
                Text(
                    text = stringResource(R.string.error_try_again),
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                        .clickable(onClick = onRetry)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
        if (!hasData) {
            DetailBackButton(onBack, Modifier.align(Alignment.TopStart).systemBarsPadding().padding(12.dp))
        }
    }
}
