package com.meydan.app.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.meydan.app.R
import com.meydan.app.core.designsystem.SecondaryButton
import com.meydan.app.core.di.AppContainer
import kotlinx.coroutines.launch

/**
 * Placeholder home. Phase 5 replaces this with the games feed; for now it
 * proves the session end-to-end: greets the cached user by name (offline data)
 * and offers logout (revokes the token server-side and clears local state).
 */
@Composable
fun HomeScreen(
    container: AppContainer,
    onLoggedOut: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(container) {
        name = container.authRepository.cachedUser()?.name.orEmpty()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineLarge,
            )
            if (name.isNotEmpty()) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
        Column(modifier = Modifier.padding(bottom = 48.dp)) {
            SecondaryButton(
                text = stringResource(R.string.auth_logout),
                onClick = {
                    scope.launch {
                        container.authRepository.logout()
                        onLoggedOut()
                    }
                },
            )
        }
    }
}
