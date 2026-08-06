package com.meydan.app.feature.teamdetail

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.meydan.app.core.common.TeamColors
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.TeamDetailDto
import com.meydan.app.core.network.dto.TeamMemberDto
import com.meydan.app.feature.detail.DetailBackButton
import com.meydan.app.feature.detail.DetailStateBox

/**
 * Team detail — port of teams/[id]/page.tsx: pitch header with the team badge,
 * name + district · members, a win/loss/points row, and the roster (captain
 * first) with each member's position and attendance.
 */
@Composable
fun TeamDetailScreen(container: AppContainer, teamId: String, onBack: () -> Unit) {
    val viewModel: TeamDetailViewModel = viewModel {
        TeamDetailViewModel(container.teamsRepository, teamId)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DetailStateBox(
        loading = state.loading,
        error = state.loadError,
        hasData = state.team != null,
        onBack = onBack,
        onRetry = viewModel::retry,
    ) {
        Content(
            team = state.team!!,
            acting = state.acting,
            onBack = onBack,
            onToggleMembership = viewModel::toggleMembership,
        )
    }
}

@Composable
private fun Content(
    team: TeamDetailDto,
    acting: Boolean,
    onBack: () -> Unit,
    onToggleMembership: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val palette = TeamColors.of(team.color)

    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            // Pitch header.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(Brush.linearGradient(listOf(Color(0xFF1C7A45), Color(0xFF0F5530)))),
            ) {
                DetailBackButton(onBack, Modifier.systemBarsPadding().padding(start = 16.dp, top = 8.dp), onDark = true)
            }
        }
        item {
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                // Badge overlapping the header.
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .offset(y = (-18).dp)
                        .size(72.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Brush.linearGradient(listOf(palette.base, palette.edge))),
                ) {
                    Text(TeamColors.monogram(team.name), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF06210F))
                }
                Text(team.name, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    text = "${team.district ?: "—"} · ${stringResource(R.string.teams_members_count, team.memberCount)}",
                    fontSize = 13.sp,
                    color = colors.onSurfaceVariant,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp),
                )
                // Win / loss / points.
                Row(modifier = Modifier.padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat(team.wins.toString(), stringResource(R.string.teams_wins), colors.primary, Modifier.weight(1f))
                    Stat(team.losses.toString(), stringResource(R.string.teams_losses), colors.onSurface, Modifier.weight(1f))
                    Stat(team.points.toString(), stringResource(R.string.teams_points), Color(0xFFF2B53C), Modifier.weight(1f))
                }
                MembershipCta(
                    team = team,
                    acting = acting,
                    onClick = onToggleMembership,
                    modifier = Modifier.padding(top = 18.dp),
                )
                Text(
                    text = stringResource(R.string.teams_roster),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
                )
            }
        }
        items(team.members, key = { it.id }) { m ->
            MemberRow(m, Modifier.padding(horizontal = 24.dp).padding(bottom = 10.dp))
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

/**
 * Join / leave. A captain gets an inert badge instead: leaving would strand the
 * team, so the only captain exit is disbanding (web-only for now).
 */
@Composable
private fun MembershipCta(
    team: TeamDetailDto,
    acting: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MaterialTheme.colorScheme

    if (team.isCaptain) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f)),
        ) {
            Text(
                text = stringResource(R.string.teams_you_are_captain),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = colors.onSurfaceVariant,
            )
        }
        return
    }

    val member = team.isMember
    Button(
        onClick = onClick,
        enabled = !acting,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (member) colors.surfaceVariant else colors.primary,
            contentColor = if (member) colors.onSurface else colors.onPrimary,
        ),
        modifier = modifier.fillMaxWidth().height(52.dp),
    ) {
        if (acting) {
            CircularProgressIndicator(
                strokeWidth = 2.5.dp,
                modifier = Modifier.size(20.dp),
                color = if (member) colors.onSurface else colors.onPrimary,
            )
        } else {
            Text(
                text = stringResource(
                    if (member) R.string.teams_leave_cta else R.string.teams_join_cta,
                ),
                fontSize = 14.5.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun Stat(value: String, label: String, valueColor: Color, modifier: Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(vertical = 12.dp),
    ) {
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = valueColor)
        Text(label, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun MemberRow(m: TeamMemberDto, modifier: Modifier) {
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors.surface).padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(38.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF1FD16B), Color(0xFF14A955)))),
        ) {
            Text(TeamColors.monogram(m.name), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF06210F))
        }
        Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(m.name, fontSize = 14.5.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (m.isCaptain) {
                    Text(
                        text = stringResource(R.string.teams_captain_badge),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFFF2B53C),
                        modifier = Modifier.padding(start = 8.dp).clip(RoundedCornerShape(6.dp)).background(Color(0xFFF2B53C).copy(alpha = 0.15f)).padding(horizontal = 7.dp, vertical = 2.dp),
                    )
                }
            }
            Text(posName(m.position), fontSize = 12.sp, color = colors.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        }
        Text(
            text = m.attendanceRate?.let { "$it%" } ?: "—",
            fontSize = 12.5.sp,
            fontWeight = FontWeight.ExtraBold,
            color = attendanceColor(m.attendanceRate),
        )
    }
}

private fun attendanceColor(rate: Int?): Color = when {
    rate == null -> Color(0xFF8A938E)
    rate >= 75 -> Color(0xFF5BE39A)
    rate >= 50 -> Color(0xFFF2B53C)
    else -> Color(0xFFE0556A)
}

@Composable
private fun posName(p: String?): String = when (p) {
    "GOALKEEPER" -> stringResource(R.string.position_goalkeeper)
    "DEFENDER" -> stringResource(R.string.position_defender)
    "MIDFIELDER" -> stringResource(R.string.position_midfielder)
    "FORWARD" -> stringResource(R.string.position_forward)
    else -> "—"
}
