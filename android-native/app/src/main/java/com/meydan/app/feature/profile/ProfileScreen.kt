package com.meydan.app.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.AddLocationAlt
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.BrightnessAuto
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.LightMode
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import com.meydan.app.core.common.GameTime
import com.meydan.app.core.datastore.ThemeMode
import com.meydan.app.core.network.dto.ProfileStatsDto
import com.meydan.app.core.network.dto.RecentGameDto
import com.meydan.app.feature.auth.errorTextRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.LocaleMapper
import com.meydan.app.core.di.AppContainer

/**
 * Profile tab — port of the web profile page: identity (with a tappable avatar
 * backed by the system photo picker), the attendance block and recent games
 * from /me/stats, and settings.
 */
@Composable
fun ProfileScreen(
    container: AppContainer,
    onLoggedOut: () -> Unit,
    onPickLanguage: (String) -> Unit,
    onEditProfile: () -> Unit,
    onSubmitField: () -> Unit,
    onModerateFields: () -> Unit,
) {
    val viewModel: ProfileViewModel = viewModel {
        ProfileViewModel(container.authRepository, container.settingsStore)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.loggedOut) {
        LaunchedEffect(Unit) { onLoggedOut() }
        return
    }

    val user = state.user
    val colors = MaterialTheme.colorScheme
    val context = LocalContext.current

    // Photo picker: on Android 13+ this is the system picker (no storage
    // permission at all); below that the shim falls back to OpenDocument.
    val pickImage = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val resolver = context.contentResolver
        val bytes = runCatching {
            resolver.openInputStream(uri)?.use { it.readBytes() }
        }.getOrNull() ?: return@rememberLauncherForActivityResult
        val mime = resolver.getType(uri) ?: "image/jpeg"
        viewModel.uploadAvatar(bytes, mime, "avatar.${mime.substringAfterLast('/')}")
    }
    val currentLangTag = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language ?: "ru"
    val langLabel = languageLabel(currentLangTag)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
    ) {
        Spacer(Modifier.height(16.dp))

        // Identity: avatar initial + name + position · district
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(74.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.15f))
                    .clickable(enabled = !state.uploadingAvatar) {
                        // With a photo set there are two things you might mean,
                        // so ask; without one there is only one.
                        if (user?.avatar != null) viewModel.openAvatarMenu()
                        else pickImage.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
            ) {
                when {
                    state.uploadingAvatar -> CircularProgressIndicator(
                        strokeWidth = 2.5.dp,
                        modifier = Modifier.size(24.dp),
                        color = colors.primary,
                    )
                    user?.avatar != null -> AsyncImage(
                        model = user.avatar,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                    else -> Text(
                        text = user?.name?.trim()?.take(1)?.uppercase() ?: "",
                        color = colors.primary,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.size(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user?.name ?: "",
                    style = MaterialTheme.typography.headlineSmall,
                    fontSize = 22.sp,
                )
                Text(
                    text = buildString {
                        append(positionLabel(user?.position))
                        append(" · ")
                        append(user?.district ?: "—")
                    },
                    fontSize = 13.5.sp,
                    color = colors.onSurfaceVariant,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        // An avatar write that failed used to leave no trace at all — the
        // spinner just stopped and the photo silently stayed as it was.
        state.avatarErrorCode?.let { code ->
            Text(
                text = stringResource(errorTextRes(code)),
                color = colors.error,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 10.dp),
            )
        }

        // Open-to-invites status pill
        val open = user?.isOpenToInvite == true
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .padding(top = 14.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(
                    if (open) colors.primary.copy(alpha = 0.10f)
                    else colors.surfaceVariant.copy(alpha = 0.5f),
                )
                .border(
                    1.dp,
                    if (open) colors.primary.copy(alpha = 0.30f) else colors.outline,
                    RoundedCornerShape(16.dp),
                )
                .padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(width = 34.dp, height = 20.dp)
                    .clip(CircleShape)
                    .background(if (open) colors.primary else colors.outline),
                contentAlignment = if (open) Alignment.CenterEnd else Alignment.CenterStart,
            ) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 2.dp)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onPrimary),
                )
            }
            Text(
                text = stringResource(
                    if (open) R.string.profile_open_invites else R.string.profile_closed_invites,
                ),
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Bold,
                color = if (open) colors.primary else colors.onSurfaceVariant,
                modifier = Modifier.padding(start = 10.dp),
            )
        }

        // Attendance + recent games. Absent until /me/stats answers, so the
        // identity block above renders immediately on a cold start.
        state.stats?.let { stats -> StatsBlock(stats) }

        // Settings card
        Text(
            text = stringResource(R.string.profile_settings),
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surface),
        ) {
            SettingsRow(
                icon = Icons.Outlined.Edit,
                label = stringResource(R.string.profile_edit),
                trailing = null,
                onClick = onEditProfile,
            )
            androidx.compose.material3.HorizontalDivider(color = colors.outlineVariant)
            SettingsRow(
                icon = Icons.Outlined.AddLocationAlt,
                label = stringResource(R.string.fields_submit),
                trailing = null,
                onClick = onSubmitField,
            )
            androidx.compose.material3.HorizontalDivider(color = colors.outlineVariant)
            SettingsRow(
                icon = Icons.Outlined.DarkMode,
                label = stringResource(R.string.profile_theme),
                trailing = stringResource(themeLabelRes(state.themeMode)),
                onClick = viewModel::openThemeMenu,
            )
            androidx.compose.material3.HorizontalDivider(color = colors.outlineVariant)
            SettingsRow(
                icon = Icons.Outlined.Language,
                label = stringResource(R.string.profile_language),
                trailing = langLabel,
                onClick = viewModel::openLanguageMenu,
            )
            if (user?.isAdmin == true) {
                androidx.compose.material3.HorizontalDivider(color = colors.outlineVariant)
                SettingsRow(
                    icon = Icons.Outlined.AdminPanelSettings,
                    label = stringResource(R.string.fields_moderation),
                    trailing = null,
                    onClick = onModerateFields,
                )
            }
            androidx.compose.material3.HorizontalDivider(color = colors.outlineVariant)
            SettingsRow(
                icon = Icons.AutoMirrored.Filled.Logout,
                label = stringResource(R.string.profile_logout_full),
                trailing = null,
                destructive = true,
                onClick = viewModel::logout,
            )
        }

        Spacer(Modifier.height(24.dp))
    }

    if (state.avatarMenuOpen) {
        AlertDialog(
            onDismissRequest = viewModel::dismissAvatarMenu,
            // Explicit: M3 defaults a dialog to shapes.extraLarge, which this
            // theme defines as a button pill.
            shape = RoundedCornerShape(28.dp),
            title = { Text(stringResource(R.string.profile_photo_title)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.dismissAvatarMenu()
                    pickImage.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                    )
                }) {
                    Text(
                        text = stringResource(R.string.profile_photo_change),
                        fontWeight = FontWeight.Bold,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::removeAvatar) {
                    Text(
                        text = stringResource(R.string.profile_photo_remove),
                        color = colors.error,
                        fontWeight = FontWeight.Bold,
                    )
                }
            },
        )
    }

    if (state.themeMenuOpen) {
        ThemePickerSheet(
            current = state.themeMode,
            onSelect = viewModel::setThemeMode,
            onDismiss = viewModel::dismissThemeMenu,
        )
    }

    if (state.languageMenuOpen) {
        LanguagePickerSheet(
            current = currentLangTag,
            onSelect = { tag ->
                viewModel.onLanguagePicked()
                onPickLanguage(tag)
            },
            onDismiss = viewModel::dismissLanguageMenu,
        )
    }
}

/** Native label for each supported language, used on the settings row and in the picker. */
private fun languageLabel(androidTag: String): String = when {
    androidTag.startsWith("tk") -> "Türkmen"
    androidTag.startsWith("en") -> "English"
    else -> "Русский"
}

/** Localized label for the current theme mode, shown on the settings row. */
private fun themeLabelRes(mode: ThemeMode): Int = when (mode) {
    ThemeMode.SYSTEM -> R.string.profile_theme_system
    ThemeMode.LIGHT -> R.string.profile_theme_light
    ThemeMode.DARK -> R.string.profile_theme_dark
}

/** Icon for a theme mode, shown in the picker. */
private fun themeIcon(mode: ThemeMode): androidx.compose.ui.graphics.vector.ImageVector = when (mode) {
    ThemeMode.SYSTEM -> Icons.Outlined.BrightnessAuto
    ThemeMode.LIGHT -> Icons.Outlined.LightMode
    ThemeMode.DARK -> Icons.Outlined.DarkMode
}

/**
 * Appearance picker as a bottom sheet: one tappable card per mode with an icon,
 * a label and a check on the selected one — the selected card is tinted and
 * outlined in the brand green. Nicer and more native than a radio dialog.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ThemePickerSheet(
    current: ThemeMode,
    onSelect: (ThemeMode) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    // Sheet sits on `surfaceVariant` (the darker/lighter tier in each theme) so
    // the white/dark card fills below actually read as raised — a white sheet
    // with white cards made the options blend into one blob in light mode.
    // Explicit shape: M3 defaults a sheet's top corners to shapes.extraLarge,
    // which this theme repurposes as a 999.dp button pill — leaving the
    // default would draw the sheet as a giant dome.
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surfaceVariant,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = stringResource(R.string.profile_theme),
                style = MaterialTheme.typography.headlineSmall,
                fontSize = 20.sp,
                modifier = Modifier.padding(bottom = 6.dp),
            )
            ThemeMode.entries.forEach { mode ->
                val selected = mode == current
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (selected) colors.primary.copy(alpha = 0.12f)
                            else colors.surface,
                        )
                        .border(
                            1.dp,
                            if (selected) colors.primary.copy(alpha = 0.45f) else colors.outline,
                            RoundedCornerShape(16.dp),
                        )
                        .clickable { onSelect(mode) }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                ) {
                    Icon(
                        imageVector = themeIcon(mode),
                        contentDescription = null,
                        tint = if (selected) colors.primary else colors.onSurfaceVariant,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        text = stringResource(themeLabelRes(mode)),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (selected) colors.primary else colors.onSurface,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 14.dp),
                    )
                    if (selected) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = null,
                            tint = colors.primary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Language picker as a bottom sheet, mirroring [ThemePickerSheet]. Three cards
 * (Russian / Türkmen / English) each drawn in their own script — the label is
 * always the language's native name, never a translated string, so a user who
 * accidentally landed in a language they don't read can still recover.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguagePickerSheet(
    current: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surfaceVariant,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = stringResource(R.string.profile_language),
                style = MaterialTheme.typography.headlineSmall,
                fontSize = 20.sp,
                modifier = Modifier.padding(bottom = 6.dp),
            )
            LocaleMapper.supportedAndroidTags.forEach { tag ->
                val selected = current.startsWith(tag)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (selected) colors.primary.copy(alpha = 0.12f)
                            else colors.surface,
                        )
                        .border(
                            1.dp,
                            if (selected) colors.primary.copy(alpha = 0.45f) else colors.outline,
                            RoundedCornerShape(16.dp),
                        )
                        .clickable { onSelect(tag) }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Language,
                        contentDescription = null,
                        tint = if (selected) colors.primary else colors.onSurfaceVariant,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        text = languageLabel(tag),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (selected) colors.primary else colors.onSurface,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 14.dp),
                    )
                    if (selected) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = null,
                            tint = colors.primary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Attendance headline + the two counters + the last few completed games.
 * Port of the web profile page's ProfileStats.
 */
@Composable
private fun StatsBlock(stats: ProfileStatsDto) {
    val colors = MaterialTheme.colorScheme

    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(top = 16.dp),
    ) {
        // Attendance, with the same proportional bar the web shows.
        Column(
            modifier = Modifier
                .weight(0.58f)
                .clip(RoundedCornerShape(18.dp))
                .background(colors.surface)
                .padding(16.dp),
        ) {
            Text(
                text = stringResource(R.string.profile_attendance),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurfaceVariant,
            )
            Text(
                text = stats.attendanceRate?.let { "$it%" } ?: "—",
                fontSize = 34.sp,
                fontWeight = FontWeight.Black,
                color = colors.primary,
                modifier = Modifier.padding(top = 6.dp),
            )
            Box(
                modifier = Modifier
                    .padding(top = 10.dp)
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceVariant),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth((stats.attendanceRate ?: 0) / 100f)
                        .height(6.dp)
                        .clip(CircleShape)
                        .background(colors.primary),
                )
            }
            Text(
                text = stringResource(
                    R.string.profile_attendance_detail,
                    stats.gamesPlayed,
                    stats.totalJoined,
                ),
                fontSize = 11.5.sp,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(0.42f),
        ) {
            Counter(stats.gamesPlayed.toString(), stringResource(R.string.profile_games_played))
            Counter(stats.totalJoined.toString(), stringResource(R.string.profile_total_joined))
        }
    }

    if (stats.recent.isNotEmpty()) {
        Text(
            text = stringResource(R.string.profile_recent_games),
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(top = 20.dp, bottom = 12.dp),
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            stats.recent.forEach { g -> RecentGameRow(g) }
        }
    }
}

@Composable
private fun Counter(value: String, label: String) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Black, color = colors.onBackground)
        Text(
            text = label,
            fontSize = 11.5.sp,
            color = colors.onSurfaceVariant,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun RecentGameRow(game: RecentGameDto) {
    val colors = MaterialTheme.colorScheme
    val dt = GameTime.parse(game.scheduledAt)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surface)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(game.venue, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(
                text = dt?.let { GameTime.shortDate(it) } ?: "—",
                fontSize = 12.sp,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        // Attendance verdict, or a dash when the organizer never marked it.
        Text(
            text = when (game.attended) {
                true -> stringResource(R.string.profile_attended)
                false -> stringResource(R.string.profile_missed)
                null -> "—"
            },
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = when (game.attended) {
                true -> colors.primary
                false -> colors.error
                null -> colors.onSurfaceVariant
            },
        )
    }
}

@Composable
private fun SettingsRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    trailing: String?,
    destructive: Boolean = false,
    onClick: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val tint = if (destructive) colors.error else colors.onSurfaceVariant
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Text(
            text = label,
            fontSize = 14.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (destructive) colors.error else colors.onBackground,
            modifier = Modifier
                .weight(1f)
                .padding(start = 12.dp),
        )
        if (trailing != null) {
            Text(text = trailing, fontSize = 13.5.sp, color = colors.onSurfaceVariant)
        }
    }
}

/** Localized position name, or an em dash when unset. */
@Composable
private fun positionLabel(position: String?): String = when (position) {
    "GOALKEEPER" -> stringResource(R.string.position_goalkeeper)
    "DEFENDER" -> stringResource(R.string.position_defender)
    "MIDFIELDER" -> stringResource(R.string.position_midfielder)
    "FORWARD" -> stringResource(R.string.position_forward)
    else -> "—"
}
