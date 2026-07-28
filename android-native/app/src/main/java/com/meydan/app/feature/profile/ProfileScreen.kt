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
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
 * Profile tab — port of the web profile page's identity block + settings.
 * Stats and recent games are deferred until a mobile stats endpoint exists;
 * everything shown here is backed by the existing /me response.
 */
@Composable
fun ProfileScreen(
    container: AppContainer,
    onLoggedOut: () -> Unit,
    onToggleLanguage: () -> Unit,
) {
    val viewModel: ProfileViewModel = viewModel { ProfileViewModel(container.authRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.loggedOut) {
        LaunchedEffect(Unit) { onLoggedOut() }
        return
    }

    val user = state.user
    val colors = MaterialTheme.colorScheme
    val currentLangTag = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language ?: "ru"
    val langLabel = if (currentLangTag == "tk") "Türkmen" else "Русский"

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
                    .background(colors.primary.copy(alpha = 0.15f)),
            ) {
                Text(
                    text = user?.name?.trim()?.take(1)?.uppercase() ?: "",
                    color = colors.primary,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                )
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
                        .background(androidx.compose.ui.graphics.Color(0xFF06210F)),
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
                icon = Icons.Outlined.Language,
                label = stringResource(R.string.profile_language),
                trailing = langLabel,
                onClick = onToggleLanguage,
            )
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
