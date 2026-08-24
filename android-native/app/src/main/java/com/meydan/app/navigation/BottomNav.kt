package com.meydan.app.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.SportsSoccer
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.meydan.app.R

/**
 * The five main sections, matching the web BottomNav order and labels.
 * Icons use Material's built-in vectors as close analogues of the web's custom
 * SVGs — same silhouette, no asset pipeline needed.
 */
enum class MainTab(val labelRes: Int, val icon: ImageVector) {
    GAMES(R.string.nav_games, Icons.Outlined.SportsSoccer),
    TEAMS(R.string.nav_teams, Icons.Outlined.Groups),
    FIELDS(R.string.nav_fields, Icons.Outlined.Place),
    TOURNAMENTS(R.string.nav_tournaments, Icons.Outlined.EmojiEvents),
    PROFILE(R.string.nav_profile, Icons.Outlined.Person),
}

/**
 * Fixed bottom navigation bar. The selected tab is primary and bold; the rest
 * are muted — the same treatment as the web's TabContent.
 */
@Composable
fun BottomNav(
    selected: MainTab,
    onSelect: (MainTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                // The web bar uses a dedicated --nav-bg shade, slightly darker
                // than surface in dark mode — match it rather than reusing surface.
                .background(com.meydan.app.core.designsystem.MeydanTheme.colors.navBg)
                .navigationBarsPadding()
                .padding(top = 10.dp, bottom = 8.dp),
        ) {
            MainTab.entries.forEach { tab ->
                NavItem(
                    tab = tab,
                    selected = tab == selected,
                    onClick = { onSelect(tab) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun NavItem(
    tab: MainTab,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val color =
        if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .clickable(
                // No ripple — the web bar just changes colour/opacity.
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(vertical = 2.dp),
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = stringResource(tab.labelRes),
            tint = color,
            modifier = Modifier.size(24.dp),
        )
        Text(
            text = stringResource(tab.labelRes),
            color = color,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            modifier = Modifier.padding(top = 5.dp),
        )
    }
}
