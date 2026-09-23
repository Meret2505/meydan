package com.meydan.app.feature.moderation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.meydan.app.R
import com.meydan.app.core.common.ImageWidth
import com.meydan.app.core.common.optimizedImageUrl
import com.meydan.app.core.designsystem.FullscreenImageViewer
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.FieldSubmissionDto
import com.meydan.app.core.common.errorTextRes
import com.meydan.app.feature.fields.surfaceLabel

/**
 * Admin moderation queue: one card per PENDING submission with its photos,
 * fields, and author, plus Approve / Reject. Reject opens a reason dialog;
 * approve is immediate (matches the "player expects a fast yes" shape more
 * than reject does).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldModerationScreen(container: AppContainer, onBack: () -> Unit) {
    val viewModel: FieldModerationViewModel = viewModel {
        FieldModerationViewModel(container.fieldSubmissionsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = MaterialTheme.colorScheme

    // Re-runs whenever the screen is entered, so a submission actioned on
    // another device (or a moment ago) doesn't linger in a stale list.
    LaunchedEffect(Unit) { viewModel.refreshOnEnter() }

    Column(modifier = Modifier.fillMaxSize().systemBarsPadding()) {
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
                text = stringResource(R.string.fields_moderation_title),
                style = MaterialTheme.typography.headlineSmall,
                fontSize = 22.sp,
                modifier = Modifier.padding(start = 4.dp),
            )
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::pullRefresh,
            modifier = Modifier.weight(1f),
        ) {
            if (!state.loading && state.submissions.isEmpty()) {
                EmptyQueue()
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.submissions, key = { it.id }) { submission ->
                        SubmissionCard(
                            submission = submission,
                            acting = state.actioningId == submission.id,
                            disabled = state.actioningId != null && state.actioningId != submission.id,
                            onApprove = { viewModel.approve(submission.id) },
                            onReject = { viewModel.openRejectDialog(submission.id) },
                        )
                    }
                }
            }
        }

        // A failure here used to be a red line and nothing else — no way to
        // try again without leaving the screen and coming back.
        state.errorCode?.let { code ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            ) {
                Text(
                    text = stringResource(errorTextRes(code)),
                    color = colors.error,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                )
                TextButton(onClick = viewModel::pullRefresh) {
                    Text(
                        text = stringResource(R.string.common_retry),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.error,
                    )
                }
            }
        }
    }

    if (state.rejectDialogFor != null) {
        RejectDialog(
            reason = state.rejectReason,
            onReasonChange = viewModel::setRejectReason,
            onConfirm = viewModel::confirmReject,
            onDismiss = viewModel::dismissRejectDialog,
        )
    }
}

@Composable
private fun SubmissionCard(
    submission: FieldSubmissionDto,
    acting: Boolean,
    disabled: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    var viewerIndex by remember { mutableStateOf<Int?>(null) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface)
            .padding(16.dp),
    ) {
        if (submission.photos.isNotEmpty()) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(bottom = 12.dp),
            ) {
                submission.photos.forEachIndexed { index, url ->
                    AsyncImage(
                        model = optimizedImageUrl(url, ImageWidth.AVATAR),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(84.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { viewerIndex = index },
                    )
                }
            }
        }

        Text(text = submission.name, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text(
            text = submission.address,
            fontSize = 13.sp,
            color = colors.onSurfaceVariant,
            modifier = Modifier.padding(top = 2.dp),
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 10.dp),
        ) {
            InfoChip(submission.district)
            InfoChip(surfaceLabel(submission.surface))
            InfoChip(stringResource(R.string.fields_capacity_chip, submission.capacity))
        }

        submission.phone?.let {
            Text(
                text = it,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
        submission.description?.let {
            Text(
                text = it,
                fontSize = 13.sp,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Text(
            text = stringResource(R.string.fields_moderation_submitted_by, submission.submittedBy.name),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp),
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        ) {
            OutlinedButton(
                onClick = onReject,
                enabled = !disabled && !acting,
                shape = MaterialTheme.shapes.large,
                modifier = Modifier.weight(1f).height(46.dp),
            ) {
                Text(stringResource(R.string.fields_moderation_reject), fontWeight = FontWeight.SemiBold)
            }
            Button(
                onClick = onApprove,
                enabled = !disabled && !acting,
                shape = MaterialTheme.shapes.large,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.primary,
                    contentColor = colors.onPrimary,
                ),
                modifier = Modifier.weight(1f).height(46.dp),
            ) {
                if (acting) {
                    CircularProgressIndicator(
                        color = colors.onPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp),
                    )
                } else {
                    Text(stringResource(R.string.fields_moderation_approve), fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    viewerIndex?.let { index ->
        FullscreenImageViewer(
            images = submission.photos,
            initialIndex = index,
            onDismiss = { viewerIndex = null },
        )
    }
}

@Composable
private fun InfoChip(text: String) {
    Text(
        text = text,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
        modifier = Modifier
            .clip(RoundedCornerShape(7.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 9.dp, vertical = 4.dp),
    )
}

@Composable
private fun EmptyQueue() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxSize().padding(40.dp),
    ) {
        Text(
            text = stringResource(R.string.fields_moderation_empty),
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            text = stringResource(R.string.fields_moderation_empty_sub),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}

/**
 * Explicit shape because M3 defaults a dialog to shapes.extraLarge, which this
 * theme defines as a button pill (same note as every other AlertDialog here).
 */
@Composable
private fun RejectDialog(
    reason: String,
    onReasonChange: (String) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.fields_moderation_reject_title)) },
        text = {
            OutlinedTextField(
                value = reason,
                onValueChange = onReasonChange,
                placeholder = { Text(stringResource(R.string.fields_moderation_reject_reason)) },
                minLines = 2,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    stringResource(R.string.fields_moderation_reject_confirm),
                    color = colors.error,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.fields_moderation_reject_cancel))
            }
        },
    )
}
