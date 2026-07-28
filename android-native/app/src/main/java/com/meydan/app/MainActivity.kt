package com.meydan.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
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
                    MeydanApp(container)
                }
            }
        }
    }
}
