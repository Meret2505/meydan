package com.meydan.app.feature.onboarding

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.meydan.app.R
import com.meydan.app.core.di.AppContainer

/**
 * Placeholder — the five-step flow (name, phone, position, district, age)
 * replaces this in the next phase.
 */
@Composable
fun OnboardingFlow(
    container: AppContainer,
    onFinished: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(stringResource(R.string.common_loading))
    }
}
