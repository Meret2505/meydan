package com.meydan.app.feature.teams

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.designsystem.OfflineBanner
import com.meydan.app.core.designsystem.TabLoading
import com.meydan.app.core.common.TeamColors
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.TeamCardDto
import com.meydan.app.core.designsystem.MeydanTheme

/**
 * Teams tab — port of the web teams page: the user's teams as cards (monogram
 * gradient, district · members · captain, ranking) and the city ranking as a
 * compact numbered list with games count.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamsScreen(
    container: AppContainer,
    onTeamClick: (String) -> Unit,
    onCreateTeam: () -> Unit,
) {
    val viewModel: TeamsViewModel = viewModel { TeamsViewModel(container.teamsRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Re-runs whenever the tab is entered, so returning from create / disband /
    // join / leave shows the real roster rather than the cached one.
    LaunchedEffect(Unit) { viewModel.refreshOnEnter() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 4.dp),
        ) {
            Text(
                text = stringResource(R.string.nav_teams),
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.weight(1f),
            )
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onCreateTeam),
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = stringResource(R.string.teams_create),
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
        if (state.offline) {
            OfflineBanner(onRetry = viewModel::pullRefresh, savedAt = state.cachedAt)
        }
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::pullRefresh,
            modifier = Modifier.fillMaxSize(),
        ) {
            // `loading` was declared and never read, so the first load showed
            // the "you're not in a team" card — which is a claim, not a state.
            if (state.loading && state.mine.isEmpty() && state.others.isEmpty()) {
                TabLoading()
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(top = 12.dp, bottom = 24.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    item {
                        SectionLabel(stringResource(R.string.teams_my_teams))
                    }
                    if (state.mine.isEmpty()) {
                        item { NotInTeamCard() }
                    } else {
                        itemsIndexed(state.mine, key = { _, t -> t.id }) { index, team ->
                            MyTeamCard(team = team, rank = index + 1, onClick = { onTeamClick(team.id) })
                        }
                    }

                    if (state.others.isNotEmpty()) {
                        item {
                            Spacer(Modifier.size(8.dp))
                            SectionLabel(stringResource(R.string.teams_city_teams))
                        }
                        item { CityTeamsList(state.others, onTeamClick) }
                        item {
                            Text(
                                text = stringResource(R.string.teams_matches_hint),
                                fontSize = 11.5.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}

@Composable
private fun NotInTeamCard() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(R.string.teams_not_in_team),
            fontSize = 13.5.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun MyTeamCard(team: TeamCardDto, rank: Int, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val palette = TeamColors.of(team.color)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface)
            .clickable(onClick = onClick)
            .padding(15.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(50.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.linearGradient(listOf(palette.base, palette.edge))),
        ) {
            Text(
                text = TeamColors.monogram(team.name),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
        Column(modifier = Modifier.weight(1f).padding(horizontal = 14.dp)) {
            Text(
                text = team.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = buildString {
                    append(team.district ?: "—")
                    append(" · ")
                    append(pluralMembers(team.memberCount))
                    team.captainName?.let {
                        append(" · ")
                        append(captainShort(it))
                    }
                },
                fontSize = 12.5.sp,
                color = colors.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "#$rank",
                fontSize = 17.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MeydanTheme.colors.warning,
            )
            Text(
                text = stringResource(R.string.teams_ranking),
                fontSize = 11.sp,
                color = colors.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CityTeamsList(teams: List<TeamCardDto>, onTeamClick: (String) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface),
    ) {
        teams.forEachIndexed { index, team ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onTeamClick(team.id) }
                    .padding(horizontal = 16.dp, vertical = 13.dp),
            ) {
                Text(
                    text = "${index + 1}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.onSurfaceVariant,
                    modifier = Modifier.size(width = 20.dp, height = 20.dp),
                )
                Text(
                    text = team.name,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "${team.gamesCount}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.primary,
                )
            }
            if (index < teams.lastIndex) {
                HorizontalDivider(color = colors.outlineVariant)
            }
        }
    }
}

@Composable
private fun pluralMembers(count: Int): String =
    stringResource(R.string.teams_members_count, count)

@Composable
private fun captainShort(name: String): String =
    stringResource(R.string.teams_captain_short, name.trim().split(" ").first())
