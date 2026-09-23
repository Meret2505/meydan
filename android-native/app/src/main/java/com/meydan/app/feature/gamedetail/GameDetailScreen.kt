package com.meydan.app.feature.gamedetail

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.common.errorTextRes
import com.meydan.app.core.designsystem.MeydanTheme
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.GameDetailDto
import com.meydan.app.core.network.dto.ParticipantDto
import com.meydan.app.feature.detail.DetailBackButton
import java.util.Locale

/**
 * Game detail — port of games/[id]/page.tsx: pitch header, when/price tiles,
 * roster with avatar stack, needed-position note, organizer (with contact
 * revealed only after joining), and a sticky join/leave CTA.
 */
@Composable
fun GameDetailScreen(
    container: AppContainer,
    gameId: String,
    onBack: () -> Unit,
) {
    val viewModel: GameDetailViewModel = viewModel {
        GameDetailViewModel(container.gamesRepository, gameId)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = MaterialTheme.colorScheme

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            state.loading && state.game == null -> {
                CircularProgressIndicator(Modifier.align(Alignment.Center))
            }
            state.loadError && state.game == null -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.align(Alignment.Center).padding(32.dp),
                ) {
                    Text(stringResource(R.string.error_generic_title))
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.error_try_again),
                        color = colors.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(onClick = viewModel::retry)
                            .background(colors.primary.copy(alpha = 0.12f))
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
            }
            state.game != null -> GameDetailContent(
                game = state.game!!,
                acting = state.acting,
                actionErrorCode = state.actionErrorCode,
                onBack = onBack,
                onToggleJoin = viewModel::toggleJoin,
                onCancelGame = viewModel::askCancel,
                onRecordResult = viewModel::openResult,
            )
        }

        state.resultDraft?.let { draft ->
            ResultSheet(
                draft = draft,
                participants = state.game?.participants ?: emptyList(),
                saving = state.acting,
                onToggle = viewModel::toggleAttendance,
                onScores = viewModel::setScores,
                onSave = viewModel::submitResult,
                onDismiss = viewModel::dismissResult,
            )
        }

        if (state.confirmingCancel) {
            CancelGameDialog(
                onConfirm = viewModel::confirmCancel,
                onDismiss = viewModel::dismissCancel,
            )
        }
        // Always reachable back button on error/loading.
        if (state.game == null) {
            DetailBackButton(onBack, Modifier.align(Alignment.TopStart).systemBarsPadding().padding(12.dp))
        }
    }
}

@Composable
private fun GameDetailContent(
    game: GameDetailDto,
    acting: Boolean,
    actionErrorCode: String?,
    onBack: () -> Unit,
    onToggleJoin: () -> Unit,
    onCancelGame: () -> Unit,
    onRecordResult: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val locale = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0)
        ?: Locale.forLanguageTag("ru")
    val dt = GameTime.parse(game.scheduledAt)
    val time = dt?.let { GameTime.time(it) } ?: "--:--"
    val day = dt?.let { dayWord(it, locale) } ?: ""
    val isOver = game.status == "COMPLETED" || game.status == "CANCELLED"

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            PitchHeader(game = game, isOver = isOver, onBack = onBack)

            Column(
                modifier = Modifier.padding(horizontal = 24.dp).padding(top = 18.dp, bottom = 120.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (game.joined) {
                    JoinedBanner(
                        text = stringResource(R.string.games_joined_banner, day, time, game.venue),
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    InfoTile(stringResource(R.string.games_when), "$day · $time", Modifier.weight(1f))
                    InfoTile(
                        stringResource(R.string.games_price),
                        game.pricePerPlayer?.let { stringResource(R.string.games_price_per_player, it) } ?: "—",
                        Modifier.weight(1f),
                    )
                }

                RosterCard(game)

                game.neededPositions.firstOrNull()?.let { NeededNote(it) }

                OrganizerRow(game)

                // Contact revealed only after joining — the server already
                // gated the phone to null otherwise, so this is defence in depth.
                if (game.joined && !game.isOrganizer) {
                    game.organizer.phone?.let { ContactRow(name = game.organizer.name, phone = it) }
                }
            }
        }

        // Sticky bottom CTA.
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(colors.background)
                .systemBarsPadding()
                .padding(horizontal = 24.dp, vertical = 12.dp),
        ) {
            // A failed join/leave/cancel used to do nothing visible at all —
            // the tap simply had no effect and the reason was dropped.
            actionErrorCode?.let { code ->
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = colors.error,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                )
            }
            CtaButton(
                game = game,
                acting = acting,
                isOver = isOver,
                onToggleJoin = onToggleJoin,
                onCancelGame = onCancelGame,
                onRecordResult = onRecordResult,
            )
        }
    }
}

@Composable
private fun PitchHeader(game: GameDetailDto, isOver: Boolean, onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(208.dp)
            .background(Brush.linearGradient(listOf(MeydanTheme.colors.pitchTop, MeydanTheme.colors.pitchBottom))),
    ) {
        // Bottom darkening for text legibility.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.35f),
                        0.35f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.9f),
                    ),
                ),
        )
        DetailBackButton(
            onBack,
            Modifier.systemBarsPadding().padding(start = 16.dp, top = 8.dp),
            onDark = true,
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 24.dp, vertical = 18.dp),
        ) {
            val bannerRes = when {
                // Cancelled and completed are both "over" but read very
                // differently to a player, so they get distinct labels.
                game.status == "CANCELLED" -> R.string.games_banner_cancelled
                isOver -> R.string.games_banner_over
                game.isOrganizer -> R.string.games_banner_yours
                else -> R.string.games_banner_open
            }
            Text(
                text = "${game.format} · ${stringResource(bannerRes)}",
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.92f))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            )
            Text(
                text = game.venue,
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

private fun Modifier.androidxClickable(onClick: () -> Unit) =
    this.clickable(onClick = onClick)

@Composable
private fun InfoTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 14.dp, vertical = 13.dp),
    ) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
        Text(value, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun JoinedBanner(text: String) {
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.primary.copy(alpha = 0.13f))
            .padding(15.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(34.dp).clip(CircleShape).background(colors.primary),
        ) {
            Icon(imageVector = Icons.Filled.Check, contentDescription = null, tint = colors.onPrimary, modifier = Modifier.size(18.dp))
        }
        Text(text, fontSize = 13.5.sp, color = colors.onSurface, modifier = Modifier.padding(start = 12.dp))
    }
}

@Composable
private fun RosterCard(game: GameDetailDto) {
    val colors = MaterialTheme.colorScheme
    val fraction = if (game.totalSpots > 0) (game.joinedCount.toFloat() / game.totalSpots).coerceIn(0f, 1f) else 0f
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface)
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(stringResource(R.string.games_roster), fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text("${game.joinedCount} / ${game.totalSpots}", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = colors.primary)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .height(7.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(colors.surfaceVariant),
        ) {
            Box(Modifier.fillMaxWidth(fraction).height(7.dp).clip(RoundedCornerShape(4.dp)).background(colors.primary))
        }
        Row(modifier = Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            game.participants.take(7).forEachIndexed { i, p ->
                Box(modifier = Modifier.offset(x = (-8 * i).dp)) {
                    ParticipantAvatar(p)
                }
            }
            if (game.openSlots > 0) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .offset(x = (-8 * game.participants.take(7).size).dp)
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceVariant),
                ) {
                    Text("${game.openSlots}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun ParticipantAvatar(p: ParticipantDto) {
    val colors = MaterialTheme.colorScheme
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(34.dp).clip(CircleShape).background(colors.primary.copy(alpha = 0.15f)),
    ) {
        Text(p.name.trim().take(1).uppercase(), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.primary)
    }
}

@Composable
private fun NeededNote(position: String) {
    val warning = MeydanTheme.colors.warning
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(warning.copy(alpha = 0.10f))
            .padding(15.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(34.dp).clip(RoundedCornerShape(11.dp)).background(warning.copy(alpha = 0.18f)),
        ) {
            Text(posShort(position), fontSize = 12.sp, fontWeight = FontWeight.Black, color = warning)
        }
        Text(
            text = stringResource(R.string.games_needed_note, posName(position).lowercase()),
            fontSize = 13.5.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

@Composable
private fun OrganizerRow(game: GameDetailDto) {
    val colors = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(42.dp).clip(CircleShape).background(colors.primary.copy(alpha = 0.15f)),
        ) {
            Text(game.organizer.name.trim().take(1).uppercase(), color = colors.primary, fontWeight = FontWeight.Bold)
        }
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(game.organizer.name, fontSize = 14.5.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                text = buildString {
                    append(stringResource(R.string.games_organizer))
                    game.organizer.attendanceRate?.let { append(" · ").append(stringResource(R.string.games_attendance_pct, it)) }
                    if (game.organizer.gamesPlayed > 0) append(" · ").append(pluralStringResource(
                        R.plurals.games_played,
                        game.organizer.gamesPlayed,
                        game.organizer.gamesPlayed,
                    ))
                },
                fontSize = 12.5.sp,
                color = colors.onSurfaceVariant,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun ContactRow(name: String, phone: String) {
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surface)
            .androidxClickable {
                // A tablet or a stripped ROM may have no dialer at all, and an
                // unhandled ACTION_DIAL takes the whole app down.
                runCatching {
                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                }
            }
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Icon(imageVector = Icons.Filled.Call, contentDescription = null, tint = colors.onBackground, modifier = Modifier.size(18.dp))
        Text(
            text = "$phone · $name",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.onBackground,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

/** Confirmation for the irreversible cancel; players are notified on confirm. */
@Composable
private fun CancelGameDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    AlertDialog(
        onDismissRequest = onDismiss,
        // Explicit: M3 defaults a dialog's container to shapes.extraLarge, which
        // this theme defines as a 999dp pill for buttons — that renders the
        // dialog as an oval. 28dp is the M3 dialog corner radius.
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.games_cancel_title)) },
        text = { Text(stringResource(R.string.games_cancel_body)) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    text = stringResource(R.string.games_cancel_confirm),
                    color = colors.error,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.games_cancel_dismiss))
            }
        },
    )
}

@Composable
private fun CtaButton(
    game: GameDetailDto,
    acting: Boolean,
    isOver: Boolean,
    onToggleJoin: () -> Unit,
    onCancelGame: () -> Unit,
    onRecordResult: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme

    // The organizer of a game that has not happened yet gets the cancel action
    // here. The "your game" badge already sits in the header, so the bottom bar
    // is free for it rather than repeating the label.
    if (game.isOrganizer && !isOver && !game.isPast) {
        Button(
            onClick = onCancelGame,
            enabled = !acting,
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.error.copy(alpha = 0.12f),
                contentColor = colors.error,
            ),
            modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
        ) {
            if (acting) {
                CircularProgressIndicator(
                    strokeWidth = 2.5.dp,
                    modifier = Modifier.size(22.dp),
                    color = colors.error,
                )
            } else {
                Text(
                    text = stringResource(R.string.games_cancel_cta),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        return
    }

    // The organizer of a game that has been played gets the write-up action.
    // This is the only route to it in the app — the feeds drop a game at
    // kickoff, so the RESULT_NEEDED notification is what brings them here.
    // Recording is optional: a game left unwritten keeps its "completed" label,
    // and the action stays available afterwards so a wrong tick can be fixed.
    if (game.isOrganizer && game.isPast && game.status != "CANCELLED") {
        Button(
            onClick = onRecordResult,
            enabled = !acting,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
        ) {
            Text(
                text = stringResource(R.string.games_result_cta),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }
        return
    }

    // Finished / past games have no action; show status text.
    if (game.isOrganizer || isOver || game.isPast) {
        val label = when {
            game.status == "CANCELLED" -> stringResource(R.string.games_cancelled_full)
            isOver -> stringResource(R.string.games_completed)
            game.isOrganizer -> stringResource(R.string.games_banner_yours)
            else -> stringResource(R.string.games_is_past)
        }
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 58.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                .padding(horizontal = 16.dp, vertical = 10.dp),
        ) {
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.onSurfaceVariant)
        }
        return
    }

    val joined = game.joined
    val disabled = game.isFull && !joined
    Button(
        onClick = onToggleJoin,
        enabled = !acting && !disabled,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (joined) colors.surfaceVariant else colors.primary,
            contentColor = if (joined) colors.onSurface else colors.onPrimary,
        ),
        modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
    ) {
        if (acting) {
            CircularProgressIndicator(strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp), color = colors.onPrimary)
        } else {
            Text(
                text = when {
                    game.isFull && !joined -> stringResource(R.string.games_full)
                    joined -> stringResource(R.string.games_joined_cta)
                    else -> stringResource(R.string.games_join_cta)
                },
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun dayWord(dt: java.time.LocalDateTime, locale: Locale): String =
    when (val d = GameTime.day(dt, locale)) {
        GameTime.Day.Today -> stringResource(R.string.games_today)
        GameTime.Day.Tomorrow -> stringResource(R.string.games_tomorrow)
        is GameTime.Day.Other -> d.formatted
    }

@Composable
private fun posName(p: String): String = when (p) {
    "GOALKEEPER" -> stringResource(R.string.position_goalkeeper)
    "DEFENDER" -> stringResource(R.string.position_defender)
    "MIDFIELDER" -> stringResource(R.string.position_midfielder)
    "FORWARD" -> stringResource(R.string.position_forward)
    else -> p
}

@Composable
private fun posShort(p: String): String = when (p) {
    "GOALKEEPER" -> stringResource(R.string.pos_short_goalkeeper)
    "DEFENDER" -> stringResource(R.string.pos_short_defender)
    "MIDFIELDER" -> stringResource(R.string.pos_short_midfielder)
    "FORWARD" -> stringResource(R.string.pos_short_forward)
    else -> p
}

/**
 * The write-up sheet: a tick per player, and a score nobody has to fill in.
 *
 * Attendance is what the reliability ratings are built from, so it comes first
 * and starts filled in; the score is labelled optional because for pick-up
 * football it usually is.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResultSheet(
    draft: ResultDraft,
    participants: List<ParticipantDto>,
    saving: Boolean,
    onToggle: (String) -> Unit,
    onScores: (String, String) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        // Explicit, like the profile sheets: M3 takes the sheet's corner from
        // shapes.extraLarge, which this theme defines as a 999dp pill for
        // buttons. Left to the default, the corner arc swallowed the sheet's
        // own title and the "who turned up" label.
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 28.dp),
        ) {
            Text(
                text = stringResource(R.string.games_result_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 16.dp),
            )

            Text(
                text = stringResource(R.string.games_result_attendance),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            participants.forEach { player ->
                val present = draft.attended[player.id] ?: true
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        // The whole row toggles, not just the box: a 20dp
                        // checkbox is a poor target on a phone.
                        .clip(RoundedCornerShape(12.dp))
                        .androidxClickable { onToggle(player.id) }
                        .padding(vertical = 6.dp),
                ) {
                    Checkbox(
                        checked = present,
                        // The row owns the gesture; the box must not swallow it.
                        onCheckedChange = null,
                    )
                    Text(
                        text = player.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (present) colors.onSurface else colors.onSurfaceVariant,
                        modifier = Modifier.padding(start = 12.dp),
                    )
                }
            }

            Text(
                text = stringResource(R.string.games_result_score),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 18.dp, bottom = 8.dp),
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = draft.home,
                    onValueChange = { onScores(it, draft.away) },
                    enabled = !saving,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f),
                )
                Text("—", fontWeight = FontWeight.Bold, color = colors.onSurfaceVariant)
                OutlinedTextField(
                    value = draft.away,
                    onValueChange = { onScores(draft.home, it) },
                    enabled = !saving,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f),
                )
            }

            PrimaryButton(
                text = stringResource(R.string.games_result_save),
                loading = saving,
                enabled = draft.canSubmit,
                onClick = onSave,
                modifier = Modifier.padding(top = 20.dp),
            )
        }
    }
}
