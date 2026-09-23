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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.meydan.app.R
import com.meydan.app.core.common.DISTRICTS
import com.meydan.app.core.common.compressForUpload
import com.meydan.app.core.designsystem.PhoneTextField
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.common.errorTextRes
import com.meydan.app.feature.fields.surfaceLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val nextField = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
    // Multi-select, capped at the three a submission may carry: one trip to the
    // gallery for all of them instead of one trip each. maxItems is fixed at
    // MAX_PHOTOS rather than the remaining slots because the contract is
    // registered once; addPhotos trims whatever does not fit.
    val pickPhotos = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(SubmitFieldViewModel.MAX_PHOTOS),
    ) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        // Three full-size images is far too much to read on the main thread.
        scope.launch {
            val picked = withContext(Dispatchers.IO) {
                val resolver = context.contentResolver
                uris.mapNotNull { uri ->
                    val bytes = runCatching {
                        resolver.openInputStream(uri)?.use { it.readBytes() }
                    }.getOrNull() ?: return@mapNotNull null
                    // Compressed here rather than at submit time: three camera
                    // frames held in form state is ~12 MB of heap, and the
                    // upload of each one would be minutes on a mobile uplink.
                    val image = compressForUpload(bytes, resolver.getType(uri) ?: "image/jpeg")
                    PickedPhoto(
                        previewUri = uri.toString(),
                        bytes = image.bytes,
                        mime = image.mime,
                        filename = "field.${image.mime.substringAfterLast('/')}",
                    )
                }
            }
            viewModel.addPhotos(picked)
        }
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
                enabled = !state.submitting,
                singleLine = true,
                // The keyboard's action key walks the form instead of just
                // closing: no form in the app used to set one.
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = nextField,
                placeholder = { Text(stringResource(R.string.fields_submit_name_placeholder)) },
                // The requirement is stated up front, not discovered by the
                // button staying grey.
                supportingText = {
                    Text(
                        pluralStringResource(
                            R.plurals.fields_submit_min_chars,
                            SubmitFieldViewModel.MIN_NAME_LENGTH,
                            SubmitFieldViewModel.MIN_NAME_LENGTH,
                        ),
                    )
                },
                isError = state.nameTooShort,
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_address))
            OutlinedTextField(
                value = state.address,
                onValueChange = viewModel::setAddress,
                enabled = !state.submitting,
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = nextField,
                placeholder = { Text(stringResource(R.string.fields_submit_address_placeholder)) },
                supportingText = {
                    Text(
                        pluralStringResource(
                            R.plurals.fields_submit_min_chars,
                            SubmitFieldViewModel.MIN_ADDRESS_LENGTH,
                            SubmitFieldViewModel.MIN_ADDRESS_LENGTH,
                        ),
                    )
                },
                isError = state.addressTooShort,
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
                                enabled = !state.submitting,
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
                        enabled = !state.submitting,
                        onClick = { viewModel.setSurface(surface) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            SectionLabel(stringResource(R.string.fields_submit_capacity))
            OutlinedTextField(
                value = state.capacity,
                onValueChange = viewModel::setCapacity,
                enabled = !state.submitting,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.fields_submit_capacity_placeholder)) },
                supportingText = {
                    Text(
                        stringResource(
                            R.string.fields_submit_capacity_hint,
                            SubmitFieldViewModel.MIN_CAPACITY,
                            SubmitFieldViewModel.MAX_CAPACITY,
                        ),
                    )
                },
                isError = state.capacityOutOfRange,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = nextField,
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_phone), optional = true)
            PhoneTextField(
                digits = state.phoneDigits,
                onDigitsChange = viewModel::setPhoneDigits,
                placeholder = stringResource(R.string.auth_phone_placeholder),
                enabled = !state.submitting,
                // Last of the single-line fields; the description below is
                // multi-line, where Enter belongs to the text.
                imeAction = ImeAction.Done,
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_description), optional = true)
            OutlinedTextField(
                value = state.description,
                onValueChange = viewModel::setDescription,
                enabled = !state.submitting,
                placeholder = { Text(stringResource(R.string.fields_submit_description_placeholder)) },
                supportingText = {
                    Text(
                        stringResource(
                            R.string.fields_submit_description_hint,
                            SubmitFieldViewModel.MAX_DESCRIPTION_LENGTH,
                        ),
                    )
                },
                minLines = 3,
                shape = MaterialTheme.shapes.large,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.fields_submit_photos), optional = true)
            val slotsLeft = SubmitFieldViewModel.MAX_PHOTOS - state.photos.size
            Text(
                text = if (slotsLeft > 0) {
                    stringResource(R.string.fields_submit_photos_hint) + " " +
                        stringResource(R.string.fields_submit_photos_left, slotsLeft)
                } else {
                    stringResource(R.string.fields_submit_photos_hint)
                },
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
                                .clickable(enabled = !state.submitting) {
                                    viewModel.removePhoto(index)
                                },
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
                            .clickable(enabled = !state.submitting) {
                                pickPhotos.launch(
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
            // Says why the button is grey. Without this the form was a guessing
            // game: every visible input could look filled while one required
            // one was empty or out of range.
            if (!state.submitting && state.missing.isNotEmpty()) {
                val names = state.missing.map { stringResource(requiredFieldLabel(it)) }
                Text(
                    text = stringResource(
                        R.string.fields_submit_missing,
                        names.joinToString(", "),
                    ),
                    fontSize = 13.sp,
                    color = colors.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
            }
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
            modifier = Modifier.weight(1f).fillMaxWidth(),
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
                textAlign = TextAlign.Center,
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
private fun SectionLabel(text: String, optional: Boolean = false) {
    Text(
        // Marking what is optional is what makes "everything required is
        // filled" a statement the user can actually check.
        text = if (optional) {
            "$text · ${stringResource(R.string.common_optional)}"
        } else {
            text
        },
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 20.dp, bottom = 10.dp),
    )
}

/** The short, lower-case field names the "still missing" line is built from. */
private fun requiredFieldLabel(field: SubmitFieldViewModel.RequiredField): Int = when (field) {
    SubmitFieldViewModel.RequiredField.NAME -> R.string.fields_submit_req_name
    SubmitFieldViewModel.RequiredField.ADDRESS -> R.string.fields_submit_req_address
    SubmitFieldViewModel.RequiredField.DISTRICT -> R.string.fields_submit_req_district
    SubmitFieldViewModel.RequiredField.SURFACE -> R.string.fields_submit_req_surface
    SubmitFieldViewModel.RequiredField.CAPACITY -> R.string.fields_submit_req_capacity
    SubmitFieldViewModel.RequiredField.DESCRIPTION -> R.string.fields_submit_req_description
}

/** A single-select bordered cell, matching CreateTeamScreen's district grid. */
@Composable
private fun ChoiceCell(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = modifier
            // Dimmed as well as inert while submitting: a cell that still looks
            // live but swallows taps is the worse of the two failures.
            .alpha(if (enabled) 1f else 0.4f)
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
            .clickable(enabled = enabled, onClick = onClick),
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
