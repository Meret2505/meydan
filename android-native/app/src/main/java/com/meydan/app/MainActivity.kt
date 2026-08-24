package com.meydan.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meydan.app.core.datastore.ThemeMode
import com.meydan.app.core.designsystem.MeydanTheme
import com.meydan.app.navigation.MeydanApp

// AppCompatActivity (not ComponentActivity) so AppCompatDelegate can drive the
// per-app language switch. It is still a ComponentActivity underneath, so
// enableEdgeToEdge() and setContent { } work unchanged.
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as MeydanApplication).container
        setContent {
            // Honour the user's saved theme choice (Profile → Тема). SYSTEM
            // falls back to the OS setting, so the default matches before any
            // choice is made.
            // Dark is the default (matches the web app) — seed the initial value
            // with it too, so there's no light flash before DataStore answers.
            val themeMode by container.settingsStore.themeMode
                .collectAsStateWithLifecycle(initialValue = ThemeMode.DARK)
            val darkTheme = when (themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }
            MeydanTheme(darkTheme = darkTheme) {
                // A Surface root sets LocalContentColor from the theme, so Text
                // without an explicit colour is legible in both themes. Without
                // it, content colour defaults to black and vanishes on the dark
                // background — every screen sits under this Surface for that
                // reason.
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    MeydanApp(container)
                }
            }
        }
    }
}
