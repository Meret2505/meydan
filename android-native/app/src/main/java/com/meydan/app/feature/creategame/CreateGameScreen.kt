package com.meydan.app.feature.creategame

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meydan.app.R
import com.meydan.app.core.designsystem.PrimaryButton
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.auth.errorTextRes
import com.meydan.app.feature.fields.FieldsViewModel
import com.meydan.app.core.designsystem.MeydanTheme
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Locale

/**
 * Create-game form — port of games/create/CreateGameForm.tsx. On success it
 * hands the new game's id up so the caller can open its detail.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGameScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
    preselectFieldId: String? = null,
) {
    val now = remember { LocalDateTime.now() }
    val viewModel: CreateGameViewModel = viewModel {
        CreateGameViewModel(container.gamesRepository, container.fieldsRepository, now, preselectFieldId)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = MaterialTheme.colorScheme
    val locale = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0) ?: Locale.forLanguageTag("ru")
    val isTm = locale.language == "tk"

    state.createdGameId?.let { id ->
        LaunchedEffect(id) { onCreated(id) }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .imePadding(),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 8.dp, top = 8.dp, end = 16.dp)) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = colors.onBackground)
            }
            Text(stringResource(R.string.games_create_title), style = MaterialTheme.typography.headlineSmall)
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // When
            FieldBlock(stringResource(R.string.games_create_when)) {
                WhenPicker(state.scheduledAt, locale, onPick = viewModel::setDateTime)
            }

            // Field: catalogue picker or free text
            FieldBlock(stringResource(R.string.games_create_field_label)) {
                if (!state.useCustomField && state.fields.isNotEmpty()) {
                    FieldDropdown(
                        fields = state.fields,
                        selectedId = state.selectedFieldId,
                        isTm = isTm,
                        onSelect = viewModel::selectField,
                    )
                    LinkText(stringResource(R.string.games_create_field_free), viewModel::useFreeText)
                } else {
                    OutlinedTextField(
                        value = state.customFieldName,
                        onValueChange = viewModel::setCustomField,
                        placeholder = { Text(stringResource(R.string.games_create_field_placeholder)) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = fieldColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (state.fields.isNotEmpty()) {
                        LinkText(stringResource(R.string.games_create_field_choose), viewModel::useCatalogue)
                    }
                }
            }

            // Total spots
            FieldBlock(stringResource(R.string.games_create_total)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CreateGameViewModel.SPOT_OPTIONS.forEach { n ->
                        SpotChip(n, active = state.totalSpots == n, onClick = { viewModel.setTotalSpots(n) }, modifier = Modifier.weight(1f))
                    }
                }
            }

            // Price
            FieldBlock(stringResource(R.string.games_create_price)) {
                OutlinedTextField(
                    value = state.price,
                    onValueChange = viewModel::setPrice,
                    placeholder = { Text("25") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            // Needed positions
            FieldBlock(stringResource(R.string.games_create_needed)) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CreateGameViewModel.POSITIONS.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            row.forEach { p ->
                                PositionChip(
                                    label = positionName(p),
                                    active = state.positions.contains(p),
                                    onClick = { viewModel.togglePosition(p) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
            }

            // Notes
            FieldBlock(stringResource(R.string.games_create_notes)) {
                OutlinedTextField(
                    value = state.notes,
                    onValueChange = viewModel::setNotes,
                    placeholder = { Text(stringResource(R.string.games_create_notes_placeholder)) },
                    minLines = 3,
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            state.errorCode?.let {
                Text(stringResource(errorTextRes(it)), color = colors.error, fontSize = 13.sp)
            }
        }

        Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)) {
            PrimaryButton(
                text = stringResource(R.string.games_create),
                loading = state.submitting,
                enabled = state.canSubmit,
                onClick = viewModel::submit,
            )
        }
    }
}

@Composable
private fun FieldBlock(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        content()
    }
}

@Composable
private fun LinkText(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.clickable(onClick = onClick).padding(top = 2.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
)

@Composable
private fun WhenPicker(value: LocalDateTime, locale: Locale, onPick: (LocalDateTime) -> Unit) {
    val context = LocalContext.current
    val colors = MaterialTheme.colorScheme
    val fmt = remember(locale) { DateTimeFormatter.ofPattern("d MMM, HH:mm", locale) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, colors.outline, RoundedCornerShape(12.dp))
            .clickable {
                // Date first, then time — chain the two system dialogs.
                DatePickerDialog(
                    context,
                    { _, y, m, d ->
                        TimePickerDialog(
                            context,
                            { _, h, min -> onPick(LocalDateTime.of(y, m + 1, d, h, min)) },
                            value.hour, value.minute, true,
                        ).show()
                    },
                    value.year, value.monthValue - 1, value.dayOfMonth,
                ).show()
            }
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(value.format(fmt), fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FieldDropdown(
    fields: List<com.meydan.app.core.network.dto.FieldCardDto>,
    selectedId: String?,
    isTm: Boolean,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = fields.firstOrNull { it.id == selectedId }
    val label = selected?.let { "${FieldsViewModel.displayName(it, isTm)} · ${it.district}" } ?: "—"

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = label,
            onValueChange = {},
            readOnly = true,
            trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
            shape = RoundedCornerShape(12.dp),
            colors = fieldColors(),
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            fields.forEach { f ->
                DropdownMenuItem(
                    text = { Text("${FieldsViewModel.displayName(f, isTm)} · ${f.district}") },
                    onClick = { onSelect(f.id); expanded = false },
                )
            }
        }
    }
}

@Composable
private fun SpotChip(n: Int, active: Boolean, onClick: () -> Unit, modifier: Modifier) {
    val colors = MaterialTheme.colorScheme
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) colors.primary.copy(alpha = 0.10f) else colors.surface)
            .border(1.dp, if (active) colors.primary else colors.outline, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
    ) {
        Text("$n", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = if (active) colors.primary else colors.onSurface)
    }
}

@Composable
private fun PositionChip(label: String, active: Boolean, onClick: () -> Unit, modifier: Modifier) {
    val warning = MeydanTheme.colors.warning
    val colors = MaterialTheme.colorScheme
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) warning.copy(alpha = 0.12f) else colors.surface)
            .border(1.dp, if (active) warning.copy(alpha = 0.4f) else colors.outline, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
    ) {
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (active) warning else colors.onSurfaceVariant)
    }
}

@Composable
private fun positionName(p: String): String = when (p) {
    "GOALKEEPER" -> stringResource(R.string.position_goalkeeper)
    "DEFENDER" -> stringResource(R.string.position_defender)
    "MIDFIELDER" -> stringResource(R.string.position_midfielder)
    else -> stringResource(R.string.position_forward)
}
