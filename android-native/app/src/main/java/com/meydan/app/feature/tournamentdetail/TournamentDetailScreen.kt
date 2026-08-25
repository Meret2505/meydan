package com.meydan.app.feature.tournamentdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.StandingsRowDto
import com.meydan.app.core.network.dto.TournamentDetailDto
import com.meydan.app.core.network.dto.TournamentMatchDto
import com.meydan.app.core.network.dto.ViewerTeamDto
import com.meydan.app.feature.auth.errorTextRes
import com.meydan.app.feature.detail.DetailBackButton
import com.meydan.app.feature.detail.DetailStateBox
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Tournament detail — port of tournaments/[id]/page.tsx: header (name, dates,
 * status, description), registered teams, the standings table, and the match
 * list, plus the two write flows: a captain entering or withdrawing their own
 * team, the creator recording a result, and the creator cancelling.
 */
@Composable
fun TournamentDetailScreen(
    container: AppContainer,
    tournamentId: String,
    onBack: () -> Unit,
    onTeamClick: (String) -> Unit,
) {
    val viewModel: TournamentDetailViewModel = viewModel {
        TournamentDetailViewModel(container.tournamentsRepository, tournamentId)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DetailStateBox(
        loading = state.loading,
        error = state.loadError,
        hasData = state.tournament != null,
        onBack = onBack,
        onRetry = viewModel::retry,
    ) {
        Content(
            tr = state.tournament!!,
            acting = state.acting,
            actionErrorCode = state.actionErrorCode,
            onBack = onBack,
            onToggleRegistration = viewModel::toggleRegistration,
            onRecord = viewModel::openRecord,
            onCancel = viewModel::askCancel,
            onTeamClick = onTeamClick,
        )
    }

    if (state.confirmingCancel) {
        AlertDialog(
            onDismissRequest = viewModel::dismissCancel,
            shape = RoundedCornerShape(28.dp),
            title = { Text(stringResource(R.string.tournaments_cancel_title)) },
            text = { Text(stringResource(R.string.tournaments_cancel_body)) },
            confirmButton = {
                TextButton(onClick = viewModel::confirmCancel) {
                    Text(
                        text = stringResource(R.string.tournaments_cancel_confirm),
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissCancel) {
                    Text(stringResource(R.string.common_cancel))
                }
            },
        )
    }

    state.recording?.let { form ->
        RecordResultDialog(
            teams = state.tournament?.teams.orEmpty(),
            form = form,
            onHome = viewModel::setHome,
            onAway = viewModel::setAway,
            onScoreHome = viewModel::setScoreHome,
            onScoreAway = viewModel::setScoreAway,
            onRound = viewModel::setRound,
            onSubmit = viewModel::submitRecord,
            onDismiss = viewModel::closeRecord,
        )
    }
}

/** Score entry for one played match, over the tournament's entered teams. */
@Composable
private fun RecordResultDialog(
    teams: List<com.meydan.app.core.network.dto.TournamentTeamDto>,
    form: TournamentDetailViewModel.RecordForm,
    onHome: (String) -> Unit,
    onAway: (String) -> Unit,
    onScoreHome: (String) -> Unit,
    onScoreAway: (String) -> Unit,
    onRound: (String) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    AlertDialog(
        onDismissRequest = onDismiss,
        // Explicit: M3 defaults a dialog to shapes.extraLarge, which this theme
        // defines as a button pill.
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.tournaments_record_title)) },
        text = {
            Column {
                Text(
                    text = stringResource(R.string.tournaments_record_home),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.onSurfaceVariant,
                )
                TeamPicker(teams, form.homeTeamId, form.awayTeamId, onHome)
                Text(
                    text = stringResource(R.string.tournaments_record_away),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.onSurfaceVariant,
                    modifier = Modifier.padding(top = 12.dp),
                )
                TeamPicker(teams, form.awayTeamId, form.homeTeamId, onAway)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(top = 14.dp),
                ) {
                    ScoreField(form.scoreHome, onScoreHome, Modifier.weight(1f))
                    ScoreField(form.scoreAway, onScoreAway, Modifier.weight(1f))
                }
                OutlinedTextField(
                    value = form.round,
                    onValueChange = onRound,
                    singleLine = true,
                    label = { Text(stringResource(R.string.tournaments_round)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = MaterialTheme.shapes.large,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.outline,
                    ),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onSubmit, enabled = form.canSubmit) {
                Text(
                    text = stringResource(R.string.tournaments_record_save),
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        },
    )
}

/** Entered teams as selectable chips; the opposing pick is excluded. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TeamPicker(
    teams: List<com.meydan.app.core.network.dto.TournamentTeamDto>,
    selected: String?,
    excluded: String?,
    onSelect: (String) -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        teams.filter { it.id != excluded }.forEach { team ->
            val active = selected == team.id
            Text(
                text = team.name,
                fontSize = 12.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (active) colors.primary else colors.onBackground,
                modifier = Modifier
                    .padding(top = 6.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        if (active) colors.primary.copy(alpha = 0.12f)
                        else colors.surfaceVariant.copy(alpha = 0.5f),
                    )
                    .clickable { onSelect(team.id) }
                    .padding(horizontal = 10.dp, vertical = 7.dp),
            )
        }
    }
}

@Composable
private fun ScoreField(value: String, onChange: (String) -> Unit, modifier: Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        shape = MaterialTheme.shapes.large,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        ),
        modifier = modifier,
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Content(
    tr: TournamentDetailDto,
    acting: Boolean,
    actionErrorCode: String?,
    onBack: () -> Unit,
    onToggleRegistration: (ViewerTeamDto) -> Unit,
    onRecord: () -> Unit,
    onCancel: () -> Unit,
    onTeamClick: (String) -> Unit,
) {
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
                                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(colors.surfaceVariant.copy(alpha = 0.5f)).clickable { onTeamClick(t.id) }.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }
            }

            // My teams — enter or withdraw. Only shown when the viewer captains
            // something, since only a captain may register a team.
            if (tr.myTeams.isNotEmpty() && tr.status != "cancelled") {
                Section(stringResource(R.string.tournaments_my_teams)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        tr.myTeams.forEach { team ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(colors.surface)
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                            ) {
                                Text(
                                    text = team.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    text = stringResource(
                                        if (team.registered) R.string.tournaments_withdraw
                                        else R.string.tournaments_enter,
                                    ),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (team.registered) colors.error else colors.primary,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(
                                            (if (team.registered) colors.error else colors.primary)
                                                .copy(alpha = 0.12f),
                                        )
                                        .clickable(enabled = !acting) { onToggleRegistration(team) }
                                        .padding(horizontal = 12.dp, vertical = 7.dp),
                                )
                            }
                        }
                    }
                }
            }

            actionErrorCode?.let { code ->
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = colors.error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 6.dp),
                )
            }

            // Standings table.
            if (tr.standings.isNotEmpty() && tr.matches.isNotEmpty()) {
                Section(stringResource(R.string.tournaments_table)) {
                    StandingsTable(tr.standings)
                }
            }

            // Record result — creator only, once two teams are in, and only
            // while the tournament is still live (not ended or cancelled), as web.
            if (tr.isCreator && tr.teams.size >= 2 &&
                tr.status != "cancelled" && tr.status != "ended"
            ) {
                Text(
                    text = stringResource(R.string.tournaments_record_cta),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .padding(top = 8.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(colors.primary.copy(alpha = 0.12f))
                        .clickable(enabled = !acting, onClick = onRecord)
                        .padding(vertical = 14.dp),
                )
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

            // Cancel — creator only, and only while it is still live.
            if (tr.isCreator && tr.status != "cancelled" && tr.status != "ended") {
                Text(
                    text = stringResource(R.string.tournaments_cancel_cta),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .padding(top = 8.dp, bottom = 24.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(colors.error.copy(alpha = 0.12f))
                        .clickable(enabled = !acting, onClick = onCancel)
                        .padding(vertical = 14.dp),
                )
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
    val goals = Modifier.width(42.dp)
    Column {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Text(stringResource(R.string.tournaments_col_team), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.onSurfaceVariant, modifier = Modifier.weight(1f))
            HeadCell(stringResource(R.string.tournaments_col_played), num)
            HeadCell(stringResource(R.string.tournaments_col_won), num)
            HeadCell(stringResource(R.string.tournaments_col_drawn), num)
            HeadCell(stringResource(R.string.tournaments_col_lost), num)
            HeadCell(stringResource(R.string.tournaments_col_diff), goals)
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
                BodyCell("${r.goalsFor}:${r.goalsAgainst}", goals)
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
