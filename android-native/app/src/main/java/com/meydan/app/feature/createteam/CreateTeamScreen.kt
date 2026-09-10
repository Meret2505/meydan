package com.meydan.app.feature.createteam

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.common.DISTRICTS
import com.meydan.app.core.common.TeamColors
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.auth.errorTextRes

/**
 * Create-team form: name, optional district, and one of five preset colours,
 * with a live badge preview. The creator becomes captain; on success we land on
 * the new team's detail.
 */
@Composable
fun CreateTeamScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val viewModel: CreateTeamViewModel = viewModel {
        CreateTeamViewModel(container.teamsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    state.createdTeamId?.let { id ->
        LaunchedEffect(id) { onCreated(id) }
        return
    }

    val colors = MaterialTheme.colorScheme

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .systemBarsPadding()
            .imePadding(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = colors.onBackground,
                )
            }
            Text(
                text = stringResource(R.string.teams_create_title),
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
            // Live badge preview, so the colour choice means something.
            val palette = TeamColors.of(state.color)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .padding(top = 8.dp, bottom = 4.dp)
                    .size(72.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Brush.linearGradient(listOf(palette.base, palette.edge))),
            ) {
                Text(
                    text = TeamColors.monogram(state.name.ifBlank { "?" }),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }

            SectionLabel(stringResource(R.string.teams_create_name))
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::setName,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.teams_create_name_placeholder)) },
                shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.teams_create_color))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CreateTeamViewModel.COLORS.forEach { key ->
                    val p = TeamColors.of(key)
                    val active = state.color == key
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(Brush.linearGradient(listOf(p.base, p.edge)))
                            .border(
                                width = if (active) 3.dp else 0.dp,
                                color = if (active) colors.onBackground else Color.Transparent,
                                shape = CircleShape,
                            )
                            .clickable { viewModel.setColor(key) },
                    )
                }
            }

            SectionLabel(stringResource(R.string.profile_edit_district))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                DISTRICTS.chunked(2).forEach { rowItems ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        rowItems.forEach { district ->
                            val active = state.district == district
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                                    .border(
                                        width = 1.dp,
                                        color = if (active) colors.primary else colors.outline,
                                        shape = RoundedCornerShape(14.dp),
                                    )
                                    .background(
                                        color = if (active) colors.primary.copy(alpha = 0.08f)
                                        else colors.surface,
                                        shape = RoundedCornerShape(14.dp),
                                    )
                                    .clickable { viewModel.setDistrict(district) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = district,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = if (active) colors.primary else colors.onBackground,
                                )
                            }
                        }
                    }
                }
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
                text = stringResource(R.string.teams_create_cta),
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
