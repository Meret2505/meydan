package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "meydan_settings")

/** User-chosen appearance. SYSTEM defers to the OS light/dark setting. */
enum class ThemeMode { SYSTEM, LIGHT, DARK }

/**
 * App-level UI preferences that outlive a session (unlike the token/user caches
 * these survive logout). Currently just the theme mode: the web app has a theme
 * toggle, so the native app offers the same choice instead of only following the
 * OS. Exposed as a Flow so the root recomposes the instant the choice changes.
 */
class SettingsStore(private val context: Context) {

    private object Keys {
        val THEME_MODE = stringPreferencesKey("theme_mode")
    }

    val themeMode: Flow<ThemeMode> = context.settingsDataStore.data.map { prefs ->
        when (prefs[Keys.THEME_MODE]) {
            "LIGHT" -> ThemeMode.LIGHT
            "DARK" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsDataStore.edit { prefs -> prefs[Keys.THEME_MODE] = mode.name }
    }
}
