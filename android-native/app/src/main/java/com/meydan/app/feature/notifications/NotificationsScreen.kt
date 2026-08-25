package com.meydan.app.feature.notifications

import android.text.format.DateUtils
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.SportsSoccer
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.NotificationDto
import com.meydan.app.feature.detail.DetailBackButton
import java.time.Instant
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/**
 * Notifications screen — the destination behind the feed's bell. Port of the
 * web notifications page: a back-titled header, newest-first rows (title, body,
 * relative time), and an empty state. A row carrying a `gameId` in its data
 * deep-links to that game, like the web's notificationHref.
 */
@Composable
fun NotificationsScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onGameClick: (String) -> Unit,
    onTeamClick: (String) -> Unit,
) {
    val viewModel: NotificationsViewModel = viewModel {
        NotificationsViewModel(container.notificationsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 12.dp),
        ) {
            DetailBackButton(onBack)
            Text(
                text = stringResource(R.string.notifications_title),
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp),
            )
            // Badge count beside the title, like the web header's unread total.
            if (state.unreadCount > 0) {
                Text(
                    text = state.unreadCount.toString(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        when {
            state.loading -> Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize(),
            ) {
                CircularProgressIndicator()
            }
            state.error -> ErrorRetry(onRetry = viewModel::retry)
            state.items.isEmpty() -> Empty()
            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 4.dp, bottom = 24.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(state.items, key = { it.id }) { notification ->
                    NotificationRow(
                        notification = notification,
                        // A game notification opens the game; a team one (e.g.
                        // TEAM_INVITE, which carries teamId not gameId) opens the
                        // team — mirroring the web's notificationHref routing.
                        onClick = {
                            val gameId = gameIdOf(notification)
                            if (gameId != null) onGameClick(gameId)
                            else teamIdOf(notification)?.let(onTeamClick)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: NotificationDto, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val unread = !notification.isRead
    val badge = badgeFor(notification.type)
    // Cancellation-type events use the error tint; everything else the primary
    // accent — mirroring the web TYPE_STYLE colour split.
    val tint = if (badge.alert) colors.error else colors.primary

    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            // Unread rows carry a faint primary wash; read rows sit on surface.
            .background(if (unread) colors.primary.copy(alpha = 0.06f) else colors.surface)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(tint.copy(alpha = 0.14f)),
        ) {
            Icon(
                imageVector = badge.icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(20.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = notification.title,
                fontSize = 15.sp,
                fontWeight = if (unread) FontWeight.Bold else FontWeight.SemiBold,
            )
            Text(
                text = notification.body,
                fontSize = 14.sp,
                color = colors.onSurface.copy(alpha = 0.8f),
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                text = relativeTime(notification.createdAt),
                fontSize = 12.sp,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        if (unread) {
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .size(9.dp)
                    .clip(CircleShape)
                    .background(colors.primary),
            )
        }
    }
}

/** A row's badge icon plus whether it reads as an alert (cancellation). */
private data class TypeBadge(val icon: ImageVector, val alert: Boolean)

/**
 * Maps a notification `type` to a Material icon, mirroring the web page's
 * TYPE_STYLE map. Unknown/future types fall back to the bell.
 */
private fun badgeFor(type: String): TypeBadge = when (type) {
    "GAME_INVITE" -> TypeBadge(Icons.Filled.SportsSoccer, alert = false)
    "PLAYER_JOINED" -> TypeBadge(Icons.Filled.Check, alert = false)
    "SPOT_OPENED" -> TypeBadge(Icons.Filled.PersonAdd, alert = false)
    "GAME_REMINDER" -> TypeBadge(Icons.Filled.Schedule, alert = false)
    "RESULT_NEEDED" -> TypeBadge(Icons.Filled.Edit, alert = false)
    "GAME_CANCELLED" -> TypeBadge(Icons.Filled.Close, alert = true)
    "TEAM_INVITE" -> TypeBadge(Icons.Filled.Groups, alert = false)
    else -> TypeBadge(Icons.Filled.Notifications, alert = false)
}

@Composable
private fun Empty() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxSize()
            .padding(40.dp),
    ) {
        Text(
            text = stringResource(R.string.notifications_empty),
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ErrorRetry(onRetry: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
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

/** The `gameId` a game-related notification carries, or null for others. */
private fun gameIdOf(notification: NotificationDto): String? =
    notification.data?.get("gameId")?.jsonPrimitive?.contentOrNull

/** The `teamId` a team-related notification (e.g. TEAM_INVITE) carries. */
private fun teamIdOf(notification: NotificationDto): String? =
    notification.data?.get("teamId")?.jsonPrimitive?.contentOrNull

/** System-localized "5 min ago" style label from the ISO createdAt instant. */
private fun relativeTime(createdAt: String): String {
    val millis = try {
        Instant.parse(createdAt).toEpochMilli()
    } catch (e: Exception) {
        return ""
    }
    return DateUtils.getRelativeTimeSpanString(
        millis,
        System.currentTimeMillis(),
        DateUtils.MINUTE_IN_MILLIS,
    ).toString()
}
