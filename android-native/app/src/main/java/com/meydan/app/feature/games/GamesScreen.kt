package com.meydan.app.feature.games

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.designsystem.OfflineBanner
import com.meydan.app.core.designsystem.TabLoading
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.GameCardDto
import com.meydan.app.core.designsystem.MeydanTheme
import java.util.Locale

/**
 * The games feed — port of GamesBoard.tsx + GameCard.tsx: title header with
 * unread badge, open/mine segmented tabs, filter chips, offline banner over
 * cached data, pull-to-refresh, per-tab empty states.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GamesScreen(
    container: AppContainer,
    onGameClick: (String) -> Unit,
    onCreateGame: () -> Unit,
    onNotifications: () -> Unit,
) {
    val viewModel: GamesViewModel = viewModel {
        GamesViewModel(container.gamesRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val locale = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0)
        ?: Locale.forLanguageTag("ru")

    // The feed VM survives the trip to the create-game screen, so re-fetch when
    // this screen resumes (returning from create/detail, or app foreground) —
    // that's what surfaces a just-created game under "Mine".
    //
    // This effect DOES fire on the initial composition, contrary to what this
    // comment used to claim: LifecycleRegistry brings a newly added observer up
    // to the current state, so an already-resumed host dispatches ON_RESUME
    // immediately. refreshOnResume() therefore skips a load that just happened.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.refreshOnResume() }

    // Logout lives in the Profile tab now; a forced logout (session expiry) is
    // still handled centrally by MeydanApp's sessionExpired collector.
    Column(
        modifier = Modifier
            .fillMaxSize()
            // Only the top inset — the bottom nav owns the bottom inset.
            .systemBarsPadding(),
    ) {
        FeedHeader(
            unread = state.unread,
            onCreateGame = onCreateGame,
            onNotifications = onNotifications,
        )
        TabRow(tab = state.tab, onSelect = viewModel::selectTab)
        ChipRow(chip = state.chip, onToggle = viewModel::toggleChip)

        if (state.offline) {
            OfflineBanner(onRetry = viewModel::pullRefresh)
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::pullRefresh,
            modifier = Modifier.weight(1f),
        ) {
            if (state.loading && state.visible.isEmpty()) {
                // Was a zero-item list: several seconds of blank app on a slow
                // connection, indistinguishable from an empty feed.
                TabLoading()
            } else if (state.visible.isEmpty()) {
                EmptyFeed(tab = state.tab)
            } else {
                LazyColumn(
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                        start = 24.dp, end = 24.dp, top = 16.dp, bottom = 24.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.visible, key = { it.id }) { game ->
                        GameCard(
                            game = game,
                            // Read once for the screen, not inside every card:
                            // reading it per card widened each card's
                            // recomposition scope to a value that only changes
                            // on a configuration change.
                            locale = locale,
                            onClick = { onGameClick(game.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FeedHeader(unread: Int, onCreateGame: () -> Unit, onNotifications: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 20.dp, top = 16.dp),
    ) {
        Text(
            text = stringResource(R.string.games_feed_title),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.weight(1f),
        )
        // Create-game entry point. The tappable Box is a full 48.dp (Material's
        // minimum) with the 34.dp disc drawn inside it, so the hit area clears
        // the guideline without the button looking oversized.
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable(onClick = onCreateGame),
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = stringResource(R.string.games_create),
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable(onClick = onNotifications),
        ) {
            Icon(
                imageVector = Icons.Filled.Notifications,
                contentDescription = stringResource(R.string.notifications_title),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(26.dp),
            )
            if (unread > 0) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-6).dp, y = 8.dp)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary),
                ) {
                    Text(
                        text = if (unread > 9) "9+" else unread.toString(),
                        fontSize = 9.sp,
                        // Without an explicit lineHeight, Text reserves its
                        // font's default leading (extra space below the
                        // baseline) — that pushed the digit visibly above
                        // center of the 16dp circle despite the Box already
                        // centering the text block itself.
                        lineHeight = 9.sp,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }
    }
}

@Composable
private fun TabRow(tab: GamesViewModel.Tab, onSelect: (GamesViewModel.Tab) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            // Full opacity so the trough actually reads as a trough — at 50%
            // it washed out and the selected segment had nothing to sit against.
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(4.dp),
    ) {
        TabButton(
            label = stringResource(R.string.games_open),
            active = tab == GamesViewModel.Tab.OPEN,
            onClick = { onSelect(GamesViewModel.Tab.OPEN) },
            modifier = Modifier.weight(1f),
        )
        TabButton(
            label = stringResource(R.string.games_mine),
            active = tab == GamesViewModel.Tab.MINE,
            onClick = { onSelect(GamesViewModel.Tab.MINE) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun TabButton(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // A mode switch is the loudest state on the screen, so the selected segment
    // is a solid accent fill rather than a tint: fill + label colour + weight
    // all change, and it reads the same in both themes (an elevation-based pill
    // would need to get lighter in dark and darker in light).
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (active) MaterialTheme.colorScheme.primary
                else androidx.compose.ui.graphics.Color.Transparent,
            )
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
            color = if (active) MaterialTheme.colorScheme.onPrimary
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ChipRow(chip: GamesViewModel.Chip?, onToggle: (GamesViewModel.Chip) -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 14.dp),
    ) {
        FilterChip(
            label = stringResource(R.string.games_today),
            active = chip == GamesViewModel.Chip.TODAY,
            onClick = { onToggle(GamesViewModel.Chip.TODAY) },
        )
        FilterChip(
            label = stringResource(R.string.games_chip_five),
            active = chip == GamesViewModel.Chip.FIVE,
            onClick = { onToggle(GamesViewModel.Chip.FIVE) },
        )
        FilterChip(
            label = stringResource(R.string.games_chip_goalie),
            active = chip == GamesViewModel.Chip.GOALIE,
            onClick = { onToggle(GamesViewModel.Chip.GOALIE) },
        )
    }
}

@Composable
private fun FilterChip(label: String, active: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    // Selected chips carry three cues, not one: a tonal fill, a solid accent
    // outline, and a bolder accent label. The fill alone (it used to be 13%)
    // was too faint to tell apart from the unselected grey.
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(
                if (active) colors.primary.copy(alpha = 0.16f) else colors.surfaceVariant,
            )
            .border(
                width = if (active) 1.5.dp else 1.dp,
                color = if (active) colors.primary else colors.outline,
                shape = RoundedCornerShape(999.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
            color = if (active) colors.primary else colors.onSurfaceVariant,
        )
    }
}

@Composable
private fun EmptyFeed(tab: GamesViewModel.Tab) {
    // A LazyColumn (rather than a plain Column) so PullToRefreshBox has a
    // scrollable child to attach the pull gesture to — without it, an empty
    // feed captures no drag and users can't refresh from nothing.
    LazyColumn(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxSize(),
    ) {
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                // Top, not Center: centering in the leftover space below the
                // chips (which also has to leave room for the bottom nav)
                // stranded this text near the middle of the screen with a
                // large dead gap above it. A fixed top offset instead keeps it
                // close to the filters, where the eye already is.
                verticalArrangement = Arrangement.Top,
                modifier = Modifier
                    .fillParentMaxSize()
                    .padding(horizontal = 40.dp, vertical = 48.dp),
            ) {
                Text(
                    text = stringResource(
                        if (tab == GamesViewModel.Tab.OPEN) R.string.empty_no_games
                        else R.string.empty_no_my_games,
                    ),
                    style = MaterialTheme.typography.titleMedium,
                    textAlign = TextAlign.Center,
                )
                if (tab == GamesViewModel.Tab.OPEN) {
                    Text(
                        text = stringResource(R.string.games_create_first_sub),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun GameCard(game: GameCardDto, locale: Locale, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val dt = remember(game.scheduledAt) { GameTime.parse(game.scheduledAt) }
    val remaining = game.totalSpots - game.joinedCount
    val isFull = remaining <= 0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(colors.surface)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = dt?.let { GameTime.time(it) } ?: "--:--",
                        style = MaterialTheme.typography.headlineSmall,
                        fontSize = 19.sp,
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        text = dayLabel(dt, locale),
                        fontSize = 13.sp,
                        color = colors.onSurfaceVariant,
                    )
                }
                Text(
                    text = buildString {
                        append(game.venue)
                        game.district?.let { append(" · ").append(it) }
                    },
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = colors.onSurface.copy(alpha = 0.8f),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Badge(
                text = if (game.mine) stringResource(R.string.games_your_game) else game.format,
                primary = game.mine,
            )
        }

        if (game.neededPositions.isNotEmpty()) {
            NeededStrip(positions = game.neededPositions)
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(top = 14.dp),
        ) {
            SpotsBar(
                filled = game.joinedCount,
                total = game.totalSpots,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.size(12.dp))
            Text(
                text = if (isFull) stringResource(R.string.games_full)
                else stringResource(R.string.games_spots, game.joinedCount, game.totalSpots),
                fontSize = 13.sp,
                style = MaterialTheme.typography.titleSmall,
                color = if (isFull) colors.onSurfaceVariant else colors.primary,
            )
        }

        if (game.participants.isNotEmpty()) {
            AvatarStack(
                names = remember(game.participants) { game.participants.map { it.name } },
                modifier = Modifier.padding(top = 14.dp),
            )
        }
    }
}

@Composable
private fun dayLabel(dt: java.time.LocalDateTime?, locale: Locale): String {
    if (dt == null) return ""
    return when (val day = GameTime.day(dt, locale)) {
        GameTime.Day.Today -> stringResource(R.string.games_today)
        GameTime.Day.Tomorrow -> stringResource(R.string.games_tomorrow)
        is GameTime.Day.Other -> day.formatted
    }
}

@Composable
private fun Badge(text: String, primary: Boolean) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text,
        fontSize = 12.sp,
        style = MaterialTheme.typography.titleSmall,
        color = if (primary) colors.primary else colors.onSurfaceVariant,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (primary) colors.primary.copy(alpha = 0.13f)
                else colors.surfaceVariant.copy(alpha = 0.6f),
            )
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

/** The "Нужен вратарь · нужен защитник" warning strip. */
@Composable
private fun NeededStrip(positions: List<String>) {
    val labels = mapOf(
        "GOALKEEPER" to R.string.position_goalkeeper,
        "DEFENDER" to R.string.position_defender,
        "MIDFIELDER" to R.string.position_midfielder,
        "FORWARD" to R.string.position_forward,
    )
    // map is inline, so stringResource is legal inside it; joinToString is not.
    val text = positions.mapNotNull { labels[it] }
        .map { stringResource(R.string.games_needed, stringResource(it).lowercase()) }
        .joinToString(" · ")
    val warning = MeydanTheme.colors.warning
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .padding(top = 12.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(warning.copy(alpha = 0.12f))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    ) {
        Icon(imageVector = Icons.Filled.WarningAmber, contentDescription = null, tint = warning, modifier = Modifier.size(14.dp))
        Text(text = text, fontSize = 12.sp, color = warning, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
private fun SpotsBar(filled: Int, total: Int, modifier: Modifier = Modifier) {
    val colors = MaterialTheme.colorScheme
    val fraction = if (total > 0) (filled.toFloat() / total).coerceIn(0f, 1f) else 0f
    Box(
        modifier = modifier
            .height(6.dp)
            .clip(RoundedCornerShape(3.dp))
            .background(colors.surfaceVariant),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction)
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(colors.primary),
        )
    }
}

/** Overlapping initials circles, capped at four plus a "+N" bubble. */
@Composable
private fun AvatarStack(names: List<String>, modifier: Modifier = Modifier) {
    val colors = MaterialTheme.colorScheme
    val shown = names.take(4)
    val extra = names.size - shown.size
    Row(modifier = modifier) {
        shown.forEachIndexed { index, name ->
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .offset(x = (-8 * index).dp)
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceVariant)
                    .padding(1.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.15f)),
            ) {
                Text(
                    text = name.trim().take(1).uppercase(),
                    fontSize = 12.sp,
                    color = colors.primary,
                )
            }
        }
        if (extra > 0) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .offset(x = (-8 * shown.size).dp)
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceVariant),
            ) {
                Text(text = "+$extra", fontSize = 11.sp, color = colors.onSurfaceVariant)
            }
        }
    }
}
