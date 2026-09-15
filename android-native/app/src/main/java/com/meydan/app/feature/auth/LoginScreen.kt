package com.meydan.app.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meydan.app.R
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.designsystem.SecondaryButton
import kotlinx.coroutines.launch

/**
 * The landing screen: logo mark, tagline, Google sign-in, phone sign-in.
 * Port of app/[locale]/(auth)/login/page.tsx.
 */
@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onPhoneClick: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

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
            LogoMark()
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.displayLarge,
                fontSize = 44.sp,
                modifier = Modifier.padding(top = 24.dp),
            )
            Text(
                text = stringResource(R.string.auth_tagline),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 10.dp).fillMaxWidth(0.8f),
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            PrimaryButton(
                text = stringResource(R.string.auth_google),
                loading = state.loading,
                onClick = {
                    scope.launch {
                        when (val result = GoogleSignInHelper(context).signIn()) {
                            is GoogleSignInHelper.Result.Success ->
                                viewModel.submitGoogleToken(result.idToken)
                            GoogleSignInHelper.Result.Cancelled ->
                                viewModel.onGoogleCancelled()
                            is GoogleSignInHelper.Result.Failed ->
                                viewModel.onGoogleFailed()
                        }
                    }
                },
            )
            SecondaryButton(
                text = stringResource(R.string.auth_phone),
                onClick = onPhoneClick,
                enabled = !state.loading,
            )
            state.errorCode?.let { code ->
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Text(
                text = stringResource(R.string.auth_terms),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, start = 16.dp, end = 16.dp),
            )
        }
    }
}

/**
 * The MEÝDAN mark: green rounded square holding a dark ball with a primary
 * ring — the same three shapes the web login builds out of divs.
 */
@Composable
private fun LogoMark() {
    Box(
        modifier = Modifier
            .size(86.dp)
            .clip(RoundedCornerShape(26.dp))
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.onPrimary),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .border(3.dp, MaterialTheme.colorScheme.primary, CircleShape),
            )
        }
    }
}

/** Maps server error codes to localized messages, like the web form's switch. */
internal fun errorTextRes(code: String): Int = when (code) {
    "wrong_password" -> R.string.error_wrong_password
    "invalid_input" -> R.string.error_invalid_input
    "rate_limited" -> R.string.error_rate_limited
    "team_in_use" -> R.string.error_team_in_use
    "phone_taken" -> R.string.error_phone_taken
    "network" -> R.string.error_offline_title
    "too_many_pending" -> R.string.error_too_many_pending
    "too_many_photos" -> R.string.error_too_many_photos
    "forbidden" -> R.string.error_forbidden
    else -> R.string.error_auth_failed
}
