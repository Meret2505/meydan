package com.meydan.app.feature.submitfield

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.meydan.app.R
import com.meydan.app.core.common.DISTRICTS
import com.meydan.app.core.designsystem.PhoneTextField
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.auth.errorTextRes
import com.meydan.app.feature.fields.surfaceLabel

/**
 * Field-submission form: name, address, district, surface, capacity, plus
 * optional phone/description/photos. Submits to moderation; the author has no
 * further write path to it (see the feature plan) — success is a standalone
 * confirmation state, not a navigation to a detail screen that doesn't exist
 * yet for a pending submission.
 */
@Composable
fun SubmitFieldScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onDone: () -> Unit,
) {
    val viewModel: SubmitFieldViewModel = viewModel {
        SubmitFieldViewModel(container.fieldSubmissionsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = MaterialTheme.colorScheme

    if (state.createdId != null) {
        SubmittedConfirmation(onDone = onDone)
        return
    }

    val context = LocalContext.current
    val pickPhoto = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val resolver = context.contentResolver
        val bytes = runCatching {
            resolver.openInputStream(uri)?.use { it.readBytes() }
        }.getOrNull() ?: return@rememberLauncherForActivityResult
        val mime = resolver.getType(uri) ?: "image/jpeg"
        viewModel.addPhoto(bytes, mime, "field.${mime.substringAfterLast('/')}", uri)
    }

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
                text = stringResource(R.string.fields_submit_title),
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
            SectionLabel(stringResource(R.string.fields_submit_name))
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::setName,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.fields_submit_name_placeholder)) },
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_address))
            OutlinedTextField(
                value = state.address,
                onValueChange = viewModel::setAddress,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.fields_submit_address_placeholder)) },
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.profile_edit_district))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                DISTRICTS.chunked(2).forEach { rowItems ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        rowItems.forEach { district ->
                            ChoiceCell(
                                label = district,
                                active = state.district == district,
                                onClick = { viewModel.setDistrict(district) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            SectionLabel(stringResource(R.string.fields_submit_surface))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SubmitFieldViewModel.SURFACES.forEach { surface ->
                    ChoiceCell(
                        label = surfaceLabel(surface),
                        active = state.surface == surface,
                        onClick = { viewModel.setSurface(surface) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            SectionLabel(stringResource(R.string.fields_submit_capacity))
            OutlinedTextField(
                value = state.capacity,
                onValueChange = viewModel::setCapacity,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.fields_submit_capacity_placeholder)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_phone))
            PhoneTextField(
                digits = state.phoneDigits,
                onDigitsChange = viewModel::setPhoneDigits,
                placeholder = stringResource(R.string.auth_phone_placeholder),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_description))
            OutlinedTextField(
                value = state.description,
                onValueChange = viewModel::setDescription,
                placeholder = { Text(stringResource(R.string.fields_submit_description_placeholder)) },
                minLines = 3,
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_photos))
            Text(
                text = stringResource(R.string.fields_submit_photos_hint),
                fontSize = 12.sp,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 10.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                state.photos.forEachIndexed { index, photo ->
                    Box(modifier = Modifier.size(72.dp)) {
                        AsyncImage(
                            model = photo.previewUri,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(12.dp)),
                        )
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(2.dp)
                                .size(22.dp)
                                .clip(CircleShape)
                                .background(colors.background.copy(alpha = 0.85f))
                                .clickable { viewModel.removePhoto(index) },
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = stringResource(R.string.common_cancel),
                                tint = colors.onBackground,
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                }
                if (state.photos.size < SubmitFieldViewModel.MAX_PHOTOS) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, colors.outline, RoundedCornerShape(12.dp))
                            .clickable {
                                pickPhoto.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                                )
                            },
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Add,
                            contentDescription = stringResource(R.string.fields_submit_photos),
                            tint = colors.onSurfaceVariant,
                        )
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
                text = stringResource(R.string.fields_submit_cta),
                loading = state.submitting,
                enabled = state.canSubmit,
                onClick = viewModel::submit,
            )
        }
    }
}

@Composable
private fun SubmittedConfirmation(onDone: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.12f)),
            ) {
                Icon(
                    imageVector = Icons.Filled.MarkEmailRead,
                    contentDescription = null,
                    tint = colors.primary,
                    modifier = Modifier.size(34.dp),
                )
            }
            Text(
                text = stringResource(R.string.fields_submit_success_title),
                style = MaterialTheme.typography.headlineSmall,
                fontSize = 20.sp,
                modifier = Modifier.padding(top = 20.dp),
            )
            Text(
                text = stringResource(R.string.fields_submit_success_body),
                fontSize = 14.sp,
                color = colors.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        Column(modifier = Modifier.padding(bottom = 20.dp)) {
            PrimaryButton(
                text = stringResource(R.string.fields_submit_done),
                onClick = onDone,
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

/** A single-select bordered cell, matching CreateTeamScreen's district grid. */
@Composable
private fun ChoiceCell(
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
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            color = if (active) colors.primary else colors.onBackground,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 4.dp),
        )
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
)
