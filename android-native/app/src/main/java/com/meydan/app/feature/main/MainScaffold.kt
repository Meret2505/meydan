package com.meydan.app.feature.main

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.core.os.ConfigurationCompat
import androidx.core.os.LocaleListCompat
import com.meydan.app.R
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.fields.FieldsScreen
import com.meydan.app.feature.games.GamesScreen
import com.meydan.app.feature.profile.ProfileScreen
import com.meydan.app.feature.teams.TeamsScreen
import com.meydan.app.feature.tournaments.TournamentsScreen
import com.meydan.app.navigation.BottomNav
import com.meydan.app.navigation.MainTab

/**
 * The signed-in shell: a bottom nav bar over swappable tab content. Selection
 * survives configuration changes (rememberSaveable). Games and Profile are
 * real; Teams/Fields/Tournaments are placeholders until their endpoints land.
 */
@Composable
fun MainScaffold(
    container: AppContainer,
    onLoggedOut: () -> Unit,
    onGameClick: (String) -> Unit,
    onFieldClick: (String) -> Unit,
    onTeamClick: (String) -> Unit,
    onTournamentClick: (String) -> Unit,
    onCreateGame: () -> Unit,
    onEditProfile: () -> Unit,
    onCreateTeam: () -> Unit,
) {
    var tab by rememberSaveable { mutableStateOf(MainTab.GAMES) }
    val currentLang = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language ?: "ru"

    Scaffold(
        bottomBar = {
            BottomNav(selected = tab, onSelect = { tab = it })
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (tab) {
                MainTab.GAMES -> GamesScreen(
                    container = container,
                    onGameClick = onGameClick,
                    onCreateGame = onCreateGame,
                )
                MainTab.TEAMS -> TeamsScreen(
                    container = container,
                    onTeamClick = onTeamClick,
                    onCreateTeam = onCreateTeam,
                )
                MainTab.FIELDS -> FieldsScreen(container = container, onFieldClick = onFieldClick)
                MainTab.TOURNAMENTS -> TournamentsScreen(container = container, onTournamentClick = onTournamentClick)
                MainTab.PROFILE -> ProfileScreen(
                    container = container,
                    onLoggedOut = onLoggedOut,
                    onToggleLanguage = { toggleLanguage(currentLang) },
                    onEditProfile = onEditProfile,
                )
            }
        }
    }
}

/**
 * Flips the app language ru <-> tk. setApplicationLocales recreates the
 * activity with the new locale and (via the manifest service) persists it.
 */
private fun toggleLanguage(currentLang: String) {
    val next = if (currentLang == "tk") "ru" else "tk"
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(next))
}
