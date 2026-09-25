package com.meydan.app

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.ViewTreeObserver
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meydan.app.core.datastore.ThemeMode
import com.meydan.app.core.designsystem.MeydanTheme
import com.meydan.app.navigation.DeepLink
import com.meydan.app.navigation.MeydanApp
import com.meydan.app.navigation.deepLinkOf
import kotlinx.coroutines.flow.MutableStateFlow

// AppCompatActivity (not ComponentActivity) so AppCompatDelegate can drive the
// per-app language switch. It is still a ComponentActivity underneath, so
// enableEdgeToEdge() and setContent { } work unchanged.
class MainActivity : AppCompatActivity() {

    /**
     * The link the app was opened with, if any, until the nav graph has acted
     * on it. A flow rather than a plain value because the second source is
     * [onNewIntent], which fires long after composition has started — the app
     * was already running when the link was tapped.
     */
    private val deepLinks = MutableStateFlow<DeepLink?>(null)

    /** Set once the nav graph knows where to start; see [holdFirstFrameUntilRouteIsKnown]. */
    @Volatile
    private var routeResolved = false

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as MeydanApplication).container
        holdFirstFrameUntilRouteIsKnown()
        // Only on a fresh start: after a rotation the link was already
        // followed, and following it again would yank the user back out of
        // wherever they have since navigated.
        if (savedInstanceState == null) deepLinks.value = deepLinkOf(intent?.dataString)
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
            // enableEdgeToEdge()'s one-shot call above only guessed the status/
            // navigation bar icon colour from the SYSTEM's light/dark setting —
            // not from `darkTheme`, which can (and by default does) disagree
            // with it. That mismatch drew dark status-bar icons over this app's
            // dark background, making the clock/signal/battery unreadable. Redo
            // it here every time the resolved theme changes so the icons always
            // match what's actually on screen.
            SideEffect {
                val style = if (darkTheme) {
                    SystemBarStyle.dark(AndroidColor.TRANSPARENT)
                } else {
                    SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
                }
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
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
                    MeydanApp(
                        container = container,
                        deepLinks = deepLinks,
                        onDeepLinkHandled = { deepLinks.value = null },
                        onRouteResolved = { routeResolved = true },
                    )
                }
            }
        }
    }

    /**
     * A link tapped while the app is already open. singleTask routes it here
     * rather than to a second activity, so the running nav graph is the one
     * that moves.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Keep it as the activity's current intent, or a later recreation
        // would replay the intent this instance was first started with.
        setIntent(intent)
        deepLinkOf(intent.dataString)?.let { deepLinks.value = it }
    }

    /**
     * Keeps the system splash on screen until there is something real to draw.
     *
     * Deciding the start destination means reading two DataStore files, which
     * on a cold process is long enough to see. The app used to draw an empty
     * background over that window: the splash handed over to a blank screen and
     * only then to the feed. Blocking the *draw* (composition carries on
     * underneath) means the splash simply stays up until the first real frame.
     *
     * No androidx.core:core-splashscreen — this is the pre-draw listener that
     * library wraps, and on API 31+ the platform provides the splash itself.
     *
     * [FIRST_FRAME_HOLD_MS] is a deadline, not a timeout to rely on: if the
     * route never resolves the app must still show *something* rather than sit
     * behind a splash forever.
     */
    private fun holdFirstFrameUntilRouteIsKnown() {
        val content = findViewById<View>(android.R.id.content)
        val deadline = SystemClock.elapsedRealtime() + FIRST_FRAME_HOLD_MS
        content.viewTreeObserver.addOnPreDrawListener(
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (!routeResolved && SystemClock.elapsedRealtime() < deadline) return false
                    content.viewTreeObserver.removeOnPreDrawListener(this)
                    return true
                }
            },
        )
    }

    private companion object {
        /** Longer than any measured route decision, short enough not to feel stuck. */
        const val FIRST_FRAME_HOLD_MS = 2_000L
    }
}
