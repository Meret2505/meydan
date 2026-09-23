package com.meydan.app.feature.createtournament

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.designsystem.rememberExitGuard
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.common.errorTextRes
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy")

/**
 * Create-tournament form: name, start date, optional end date and description.
 * On success we land on the new tournament's detail, where the creator can
 * then enter teams and record results.
 */
@Composable
fun CreateTournamentScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val viewModel: CreateTournamentViewModel = viewModel {
        CreateTournamentViewModel(container.tournamentsRepository, LocalDate.now())
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    state.createdId?.let { id ->
        LaunchedEffect(id) { onCreated(id) }
        return
    }

    val colors = MaterialTheme.colorScheme
    val exit = rememberExitGuard(state.hasUnsavedInput, onBack)

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
            IconButton(onClick = exit.requestExit) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = colors.onBackground,
                )
            }
            Text(
                text = stringResource(R.string.tournaments_create_title),
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
            SectionLabel(stringResource(R.string.tournaments_create_name))
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::setName,
                singleLine = true,
                placeholder = { Text(stringResource(R.string.tournaments_create_name_placeholder)) },
                shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            SectionLabel(stringResource(R.string.tournaments_create_start))
            DateField(
                value = state.startDate,
                placeholder = null,
                onPick = viewModel::setStart,
            )

            SectionLabel(stringResource(R.string.tournaments_create_end))
            DateField(
                value = state.endDate,
                placeholder = stringResource(R.string.tournaments_create_end_optional),
                onPick = viewModel::setEnd,
                // An end before the start is the one combination the server
                // rejects, so keep the picker from offering it at all.
                minDate = state.startDate,
            )

            SectionLabel(stringResource(R.string.tournaments_create_description))
            OutlinedTextField(
                value = state.description,
                onValueChange = viewModel::setDescription,
                minLines = 3,
                shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.outline,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

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
                text = stringResource(R.string.tournaments_create_cta),
                loading = state.submitting,
                enabled = state.canSubmit,
                onClick = viewModel::submit,
            )
        }
    }
}

/** Tappable date row backed by the platform date picker. */
@Composable
private fun DateField(
    value: LocalDate?,
    placeholder: String?,
    onPick: (LocalDate) -> Unit,
    minDate: LocalDate? = null,
) {
    val context = LocalContext.current
    val colors = MaterialTheme.colorScheme
    val shown = value ?: minDate ?: LocalDate.now()

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface)
            .clickable {
                DatePickerDialog(
                    context,
                    { _, y, m, d -> onPick(LocalDate.of(y, m + 1, d)) },
                    shown.year,
                    shown.monthValue - 1,
                    shown.dayOfMonth,
                ).apply {
                    minDate?.let {
                        datePicker.minDate =
                            it.atStartOfDay(java.time.ZoneId.systemDefault())
                                .toInstant()
                                .toEpochMilli()
                    }
                }.show()
            }
            .padding(horizontal = 16.dp),
    ) {
        Text(
            text = value?.format(DATE_FORMAT) ?: placeholder.orEmpty(),
            fontSize = 15.sp,
            fontWeight = if (value != null) FontWeight.Bold else FontWeight.Normal,
            color = if (value != null) colors.onBackground else colors.onSurfaceVariant,
        )
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
