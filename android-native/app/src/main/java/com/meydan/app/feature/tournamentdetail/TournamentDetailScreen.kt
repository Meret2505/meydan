package com.meydan.app.feature.tournamentdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.meydan.app.core.common.DetailViewModel
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.StandingsRowDto
import com.meydan.app.core.network.dto.TournamentDetailDto
import com.meydan.app.core.network.dto.TournamentMatchDto
import com.meydan.app.feature.detail.DetailBackButton
import com.meydan.app.feature.detail.DetailStateBox
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Tournament detail — port of tournaments/[id]/page.tsx: header (name, dates,
 * status, description), registered teams, the standings table, and the match
 * list. Read-only; the record-result and cancel actions are out of scope.
 */
@Composable
fun TournamentDetailScreen(container: AppContainer, tournamentId: String, onBack: () -> Unit) {
    val viewModel: DetailViewModel<TournamentDetailDto> = viewModel {
        DetailViewModel { container.tournamentsRepository.detail(tournamentId) }
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DetailStateBox(
        loading = state.loading,
        error = state.error,
        hasData = state.data != null,
        onBack = onBack,
        onRetry = viewModel::retry,
    ) {
        Content(tr = state.data!!, onBack = onBack)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Content(tr: TournamentDetailDto, onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val locale = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0) ?: Locale.forLanguageTag("ru")

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.systemBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            DetailBackButton(onBack)
        }

        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(top = 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header card.
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(colors.surface).padding(20.dp)) {
                Text(tr.name, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    text = "${dateRange(tr, locale)} · ${statusLabel(tr.status)}",
                    fontSize = 13.sp,
                    color = if (tr.status == "ongoing") colors.primary else colors.onSurfaceVariant,
                    fontWeight = if (tr.status == "ongoing") FontWeight.Bold else FontWeight.Normal,
                    modifier = Modifier.padding(top = 4.dp),
                )
                if (!tr.description.isNullOrBlank()) {
                    Text(tr.description, fontSize = 14.sp, color = colors.onSurface.copy(alpha = 0.85f), modifier = Modifier.padding(top = 12.dp))
                }
            }

            // Teams.
            Section(stringResource(R.string.tournaments_teams_section, tr.teams.size)) {
                if (tr.teams.isEmpty()) {
                    Text(stringResource(R.string.tournaments_no_registered), fontSize = 13.sp, color = colors.onSurfaceVariant)
                } else {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        tr.teams.forEach { t ->
                            Text(
                                text = "${t.name} · ${t.memberCount}",
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.onSurface,
                                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(colors.surfaceVariant.copy(alpha = 0.5f)).padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }
            }

            // Standings table.
            if (tr.standings.isNotEmpty() && tr.matches.isNotEmpty()) {
                Section(stringResource(R.string.tournaments_table)) {
                    StandingsTable(tr.standings)
                }
            }

            // Matches.
            Section(stringResource(R.string.tournaments_matches_section, tr.matches.size)) {
                if (tr.matches.isEmpty()) {
                    Text(stringResource(R.string.tournaments_no_matches), fontSize = 13.sp, color = colors.onSurfaceVariant)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        tr.matches.forEach { MatchRow(it) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp)) {
        Text(title, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 12.dp))
        content()
    }
}

@Composable
private fun StandingsTable(rows: List<StandingsRowDto>) {
    val colors = MaterialTheme.colorScheme
    val num = Modifier.width(26.dp)
    Column {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Text(stringResource(R.string.tournaments_col_team), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.onSurfaceVariant, modifier = Modifier.weight(1f))
            HeadCell(stringResource(R.string.tournaments_col_played), num)
            HeadCell(stringResource(R.string.tournaments_col_won), num)
            HeadCell(stringResource(R.string.tournaments_col_drawn), num)
            HeadCell(stringResource(R.string.tournaments_col_lost), num)
            HeadCell(stringResource(R.string.tournaments_col_points), num, colors.primary)
        }
        rows.forEachIndexed { i, r ->
            HorizontalDivider(color = colors.outlineVariant)
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${i + 1}. ${r.teamName}",
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                BodyCell("${r.played}", num)
                BodyCell("${r.won}", num)
                BodyCell("${r.drawn}", num)
                BodyCell("${r.lost}", num)
                Text("${r.points}", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = colors.primary, textAlign = TextAlign.Center, modifier = num)
            }
        }
    }
}

@Composable
private fun HeadCell(text: String, modifier: Modifier, color: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color, textAlign = TextAlign.Center, modifier = modifier)
}

@Composable
private fun BodyCell(text: String, modifier: Modifier) {
    Text(text, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = modifier)
}

@Composable
private fun MatchRow(m: TournamentMatchDto) {
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(colors.background).padding(12.dp),
    ) {
        Text(m.homeTeamName, fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        Text(
            text = "${m.scoreHome ?: "-"} : ${m.scoreAway ?: "-"}",
            fontSize = 18.sp,
            fontWeight = FontWeight.ExtraBold,
            color = colors.primary,
            modifier = Modifier.padding(horizontal = 12.dp),
        )
        Text(m.awayTeamName, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
    }
}

private fun dateRange(tr: TournamentDetailDto, locale: Locale): String {
    val fmt = DateTimeFormatter.ofPattern("d MMM yyyy", locale)
    val start = GameTime.parse(tr.startDate)?.format(fmt) ?: ""
    val end = tr.endDate?.let { GameTime.parse(it)?.format(fmt) }
    return if (end != null) "$start — $end" else start
}

@Composable
private fun statusLabel(status: String): String = when (status) {
    "ongoing" -> stringResource(R.string.tournaments_status_ongoing)
    "cancelled" -> stringResource(R.string.tournaments_status_cancelled)
    "ended" -> stringResource(R.string.tournaments_status_ended)
    else -> stringResource(R.string.tournaments_status_upcoming)
}
