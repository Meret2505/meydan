package com.meydan.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.meydan.app.core.designsystem.MeydanTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Draw behind the system bars; screens apply their own insets. The web
        // app's StatusBar component was a safe-area spacer for the WebView —
        // natively this is handled properly by WindowInsets.
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            MeydanTheme {
                // A Surface root sets LocalContentColor from the theme, so Text
                // without an explicit colour is legible in both themes. Without
                // it, content colour defaults to black and vanishes on the dark
                // background — every screen sits under this Surface for that
                // reason.
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    MeydanApp()
                }
            }
        }
    }
}

/**
 * Placeholder root. Replaced by the NavHost once the auth and feed screens
 * land; for now it exists so the theme and toolchain can be verified on a
 * device.
 */
@Composable
private fun MeydanApp() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = "MEÝDAN", style = MaterialTheme.typography.headlineLarge)
        Text(
            text = "Native shell",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
