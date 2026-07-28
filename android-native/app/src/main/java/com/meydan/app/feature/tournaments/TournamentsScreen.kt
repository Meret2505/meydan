package com.meydan.app.feature.tournaments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.TournamentCardDto
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Tournaments tab — port of the web tournaments page: three status tabs
 * (upcoming / ongoing / ended) over one fetched set, cards with a trophy, name,
 * date range · teams · matches, and a status badge. Per-tab empty states.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentsScreen(container: AppContainer) {
    val viewModel: TournamentsViewModel = viewModel {
        TournamentsViewModel(container.tournamentsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Text(
            text = stringResource(R.string.nav_tournaments),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(top = 16.dp, bottom = 12.dp),
        )

        // Segmented tab bar.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                .padding(4.dp),
        ) {
            TabButton(stringResource(R.string.tournaments_tab_upcoming), state.tab == TournamentsViewModel.Tab.UPCOMING, { viewModel.selectTab(TournamentsViewModel.Tab.UPCOMING) }, Modifier.weight(1f))
            TabButton(stringResource(R.string.tournaments_tab_ongoing), state.tab == TournamentsViewModel.Tab.ONGOING, { viewModel.selectTab(TournamentsViewModel.Tab.ONGOING) }, Modifier.weight(1f))
            TabButton(stringResource(R.string.tournaments_tab_ended), state.tab == TournamentsViewModel.Tab.ENDED, { viewModel.selectTab(TournamentsViewModel.Tab.ENDED) }, Modifier.weight(1f))
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::pullRefresh,
            modifier = Modifier
                .weight(1f)
                .padding(top = 12.dp),
        ) {
            if (!state.loading && state.visible.isEmpty()) {
                EmptyTournaments(state.tab)
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.visible, key = { it.id }) { TournamentCard(it) }
                }
            }
        }
    }
}

@Composable
private fun TabButton(label: String, active: Boolean, onClick: () -> Unit, modifier: Modifier) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) MaterialTheme.colorScheme.background else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = if (active) MaterialTheme.colorScheme.onBackground
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun TournamentCard(t: TournamentCardDto) {
    val colors = MaterialTheme.colorScheme
    val locale = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0)
        ?: Locale.forLanguageTag("ru")
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface)
            .padding(16.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(colors.primary.copy(alpha = 0.15f)),
        ) {
            Text(text = "🏆", fontSize = 20.sp)
        }
        Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(
                text = t.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = dateAndCounts(t, locale),
                fontSize = 12.5.sp,
                color = colors.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        StatusBadge(t.status)
    }
}

@Composable
private fun StatusBadge(status: String) {
    val colors = MaterialTheme.colorScheme
    val (labelRes, fg, bg) = when (status) {
        "ongoing" -> Triple(R.string.tournaments_status_ongoing, colors.primary, colors.primary.copy(alpha = 0.15f))
        "cancelled" -> Triple(R.string.tournaments_status_cancelled, colors.error, colors.error.copy(alpha = 0.15f))
        "ended" -> Triple(R.string.tournaments_status_ended, colors.onSurfaceVariant, colors.surfaceVariant.copy(alpha = 0.6f))
        else -> Triple(R.string.tournaments_status_upcoming, colors.onSurfaceVariant, colors.surfaceVariant.copy(alpha = 0.6f))
    }
    Text(
        text = stringResource(labelRes).uppercase(),
        fontSize = 10.5.sp,
        fontWeight = FontWeight.ExtraBold,
        color = fg,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
private fun EmptyTournaments(tab: TournamentsViewModel.Tab) {
    val subRes = when (tab) {
        TournamentsViewModel.Tab.UPCOMING -> R.string.tournaments_empty_upcoming
        TournamentsViewModel.Tab.ONGOING -> R.string.tournaments_empty_ongoing
        TournamentsViewModel.Tab.ENDED -> R.string.tournaments_empty_ended
    }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxSize().padding(40.dp),
    ) {
        Text(text = "🏆", fontSize = 32.sp)
        Text(
            text = stringResource(R.string.tournaments_empty_title),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 12.dp),
        )
        Text(
            text = stringResource(subRes),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}

/** "5 июл. — 12 июл. · 6 команд · 10 матчей", localized. */
@Composable
private fun dateAndCounts(t: TournamentCardDto, locale: Locale): String {
    val fmt = DateTimeFormatter.ofPattern("d MMM", locale)
    val start = GameTime.parse(t.startDate)?.format(fmt) ?: ""
    val end = t.endDate?.let { GameTime.parse(it)?.format(fmt) }
    val dates = if (end != null) "$start — $end" else start
    val teams = "${t.teamsCount} ${stringResource(R.string.tournaments_teams_count)}"
    val matches = "${t.matchesCount} ${stringResource(R.string.tournaments_matches_count)}"
    return "$dates · $teams · $matches"
}
