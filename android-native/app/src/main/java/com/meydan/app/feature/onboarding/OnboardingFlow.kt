package com.meydan.app.feature.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.DISTRICTS
import com.meydan.app.core.common.POSITIONS
import com.meydan.app.core.common.Position
import com.meydan.app.core.designsystem.PhoneTextField
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.common.errorTextRes

/**
 * The five-step onboarding wizard: name, phone, position, district, age.
 * Port of the web's onboarding pages; one composable with internal step state
 * instead of five routes, since steps share the header and one ViewModel.
 */
@Composable
fun OnboardingFlow(
    container: AppContainer,
    onFinished: () -> Unit,
) {
    val viewModel: OnboardingViewModel =
        viewModel { OnboardingViewModel(container.authRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    // Current app language, persisted with the completing patch so server push
    // text matches the UI — the same locale the web onboarding sends.
    val androidLanguageTag = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.toLanguageTag() ?: "ru"

    if (state.finished) {
        // Navigation is a side effect of the state flag so process death or
        // recomposition cannot re-trigger it mid-transition.
        LaunchedEffect(Unit) { onFinished() }
        return
    }

    // The system back gesture steps backwards through the wizard rather than
    // leaving it, like the web header's back link.
    BackHandler(enabled = state.step > 1) { viewModel.back() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .imePadding(),
    ) {
        OnboardingHeader(
            step = state.step,
            onBack = if (state.step > 1) viewModel::back else null,
        )

        val (titleRes, subRes) = when (state.step) {
            1 -> R.string.onboarding_name_title to R.string.onboarding_name_sub
            2 -> R.string.onboarding_phone_title to R.string.onboarding_phone_sub
            3 -> R.string.onboarding_position_title to R.string.onboarding_position_sub
            4 -> R.string.onboarding_district_title to R.string.onboarding_district_sub
            else -> R.string.onboarding_age_title to R.string.onboarding_age_sub
        }
        Column(modifier = Modifier.padding(horizontal = 28.dp)) {
            Text(
                text = stringResource(titleRes),
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(top = 24.dp),
            )
            Text(
                text = stringResource(subRes),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 28.dp)
                .padding(top = 28.dp),
        ) {
            when (state.step) {
                1 -> NameStep(state.name, viewModel::onNameChange)
                2 -> PhoneStep(state.phoneDigits, viewModel::onPhoneChange)
                3 -> PositionStep(state.position, viewModel::onPositionSelect)
                4 -> DistrictStep(state.district, viewModel::onDistrictSelect)
                else -> AgeStep(state.ageMid, viewModel::onAgeSelect)
            }

            state.errorCode?.let { code ->
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 14.dp),
                )
            }
        }

        Column(
            modifier = Modifier.padding(horizontal = 28.dp, vertical = 0.dp)
                .padding(bottom = 24.dp),
        ) {
            PrimaryButton(
                text = stringResource(
                    if (state.step == OnboardingViewModel.STEP_COUNT) R.string.onboarding_finish
                    else R.string.common_next,
                ),
                loading = state.loading,
                enabled = state.canProceed,
                onClick = { viewModel.next(androidLanguageTag) },
            )
            if (state.step == OnboardingViewModel.STEP_COUNT) {
                TextButton(
                    onClick = { viewModel.skipAge(androidLanguageTag) },
                    enabled = !state.loading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                ) {
                    Text(
                        text = stringResource(R.string.common_skip),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

/** Back arrow + five progress segments + "N/5", like OnboardingHeader.tsx. */
@Composable
private fun OnboardingHeader(step: Int, onBack: (() -> Unit)?) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = MaterialTheme.colorScheme.onBackground,
                )
            }
        } else {
            Spacer(Modifier.size(48.dp))
        }
        Row(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            repeat(OnboardingViewModel.STEP_COUNT) { i ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(
                            color = if (i < step) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(2.dp),
                        ),
                )
            }
        }
        Text(
            text = "$step/${OnboardingViewModel.STEP_COUNT}",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun NameStep(name: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = name,
        onValueChange = onChange,
        singleLine = true,
        shape = MaterialTheme.shapes.large,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun PhoneStep(digits: String, onChange: (String) -> Unit) {
    Column {
        PhoneTextField(
            digits = digits,
            onDigitsChange = onChange,
            placeholder = stringResource(R.string.auth_phone_placeholder),
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(R.string.onboarding_private_hint),
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 10.dp),
        )
    }
}

@Composable
private fun PositionStep(selected: Position?, onSelect: (Position) -> Unit) {
    val labels = mapOf(
        Position.GOALKEEPER to R.string.position_goalkeeper,
        Position.DEFENDER to R.string.position_defender,
        Position.MIDFIELDER to R.string.position_midfielder,
        Position.FORWARD to R.string.position_forward,
    )
    // Resource qualifiers resolve the strings automatically, but abbr/sub live
    // in StaticData (they are data, not resources) — pick by current language.
    val isTurkmen = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language == "tk"

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(POSITIONS) { info ->
            val active = selected == info.value
            Column(
                modifier = Modifier
                    .border(
                        width = 1.dp,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                        shape = RoundedCornerShape(20.dp),
                    )
                    .background(
                        color = if (active)
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                        else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(20.dp),
                    )
                    .clickable { onSelect(info.value) }
                    .padding(20.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .border(
                            width = 1.dp,
                            color = if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
                            shape = MaterialTheme.shapes.medium,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (isTurkmen) info.abbrTm else info.abbrRu,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = stringResource(labels.getValue(info.value)),
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    modifier = Modifier.padding(top = 14.dp),
                )
                Text(
                    text = if (isTurkmen) info.subTm else info.subRu,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun DistrictStep(selected: String?, onSelect: (String) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(DISTRICTS) { district ->
            val active = selected == district
            Box(
                modifier = Modifier
                    .height(64.dp)
                    .border(
                        width = 1.dp,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                        shape = RoundedCornerShape(16.dp),
                    )
                    .background(
                        color = if (active)
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                        else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(16.dp),
                    )
                    .clickable { onSelect(district) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = district,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = if (active) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onBackground,
                )
            }
        }
    }
}

@Composable
private fun AgeStep(selected: Int?, onSelect: (Int) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(OnboardingViewModel.AGE_RANGES) { range ->
            val active = selected == range.mid
            Box(
                modifier = Modifier
                    .height(64.dp)
                    .border(
                        width = 1.dp,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                        shape = RoundedCornerShape(16.dp),
                    )
                    .background(
                        color = if (active)
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                        else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(16.dp),
                    )
                    .clickable { onSelect(range.mid) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = range.label,
                    fontWeight = FontWeight.Bold,
                    fontSize = 19.sp,
                    color = if (active) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onBackground,
                )
            }
        }
    }
}
