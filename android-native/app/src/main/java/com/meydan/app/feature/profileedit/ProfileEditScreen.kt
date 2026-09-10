package com.meydan.app.feature.profileedit

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.foundation.text.KeyboardOptions
import com.meydan.app.R
import com.meydan.app.core.common.DISTRICTS
import com.meydan.app.core.common.POSITIONS
import com.meydan.app.core.common.Position
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.auth.errorTextRes

/**
 * Profile-edit form. Mirrors the web ProfileEditForm — name, position,
 * district, skill level, age, and the open-to-invites toggle — over a single
 * PATCH /me on save. Returns to the profile tab once the write succeeds.
 */
@Composable
fun ProfileEditScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val viewModel: ProfileEditViewModel =
        viewModel { ProfileEditViewModel(container.authRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.saved) {
        LaunchedEffect(Unit) { onSaved() }
        return
    }

    val colors = MaterialTheme.colorScheme

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .systemBarsPadding()
            .imePadding(),
    ) {
        // Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = colors.onBackground,
                )
            }
            Text(
                text = stringResource(R.string.profile_edit_title),
                style = MaterialTheme.typography.headlineSmall,
                fontSize = 22.sp,
                modifier = Modifier.padding(start = 4.dp),
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            SectionLabel(stringResource(R.string.profile_edit_name))
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::setName,
                singleLine = true,
                shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.onboarding_position_title))
            PositionPicker(state.position, viewModel::setPosition)

            SectionLabel(stringResource(R.string.profile_edit_district))
            DistrictPicker(state.district, viewModel::setDistrict)

            SectionLabel(stringResource(R.string.profile_edit_skill))
            SkillPicker(state.skillLevel, viewModel::setSkill)

            SectionLabel(stringResource(R.string.onboarding_age_title))
            OutlinedTextField(
                value = state.age,
                onValueChange = viewModel::setAge,
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            // Open-to-invites toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .padding(top = 20.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(colors.surface)
                    .border(1.dp, colors.outline, RoundedCornerShape(16.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Text(
                    text = stringResource(
                        if (state.isOpenToInvite) R.string.profile_open_invites
                        else R.string.profile_closed_invites,
                    ),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onBackground,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = state.isOpenToInvite,
                    onCheckedChange = viewModel::setOpenToInvite,
                )
            }

            state.errorCode?.let { code ->
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = colors.error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 14.dp),
                )
            }

            Spacer(Modifier.height(20.dp))
        }

        Column(modifier = Modifier.padding(horizontal = 24.dp).padding(bottom = 20.dp)) {
            PrimaryButton(
                text = stringResource(R.string.profile_edit_save),
                loading = state.submitting,
                enabled = state.canSubmit,
                onClick = viewModel::submit,
            )
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 20.dp, bottom = 10.dp),
    )
}

@Composable
private fun PositionPicker(selected: Position?, onSelect: (Position) -> Unit) {
    val labels = mapOf(
        Position.GOALKEEPER to R.string.position_goalkeeper,
        Position.DEFENDER to R.string.position_defender,
        Position.MIDFIELDER to R.string.position_midfielder,
        Position.FORWARD to R.string.position_forward,
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        POSITIONS.chunked(2).forEach { rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowItems.forEach { info ->
                    ChoiceChip(
                        label = stringResource(labels.getValue(info.value)),
                        active = selected == info.value,
                        onClick = { onSelect(info.value) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun DistrictPicker(selected: String?, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        DISTRICTS.chunked(2).forEach { rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowItems.forEach { district ->
                    ChoiceChip(
                        label = district,
                        active = selected == district,
                        onClick = { onSelect(district) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun SkillPicker(selected: String, onSelect: (String) -> Unit) {
    val labels = mapOf(
        "BEGINNER" to R.string.skill_beginner,
        "INTERMEDIATE" to R.string.skill_intermediate,
        "ADVANCED" to R.string.skill_advanced,
    )
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ProfileEditViewModel.SKILLS.forEach { skill ->
            ChoiceChip(
                label = stringResource(labels.getValue(skill)),
                active = selected == skill,
                onClick = { onSelect(skill) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ChoiceChip(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = modifier
            .height(52.dp)
            .border(
                width = if (active) 1.5.dp else 1.dp,
                color = if (active) colors.primary else colors.outline,
                shape = RoundedCornerShape(14.dp),
            )
            .background(
                color = if (active) colors.primary.copy(alpha = 0.16f) else colors.surface,
                shape = RoundedCornerShape(14.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = if (active) colors.primary else colors.onBackground,
        )
    }
}
