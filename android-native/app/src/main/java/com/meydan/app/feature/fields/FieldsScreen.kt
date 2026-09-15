package com.meydan.app.feature.fields

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.meydan.app.R
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.FieldCardDto
import com.meydan.app.core.designsystem.MeydanTheme

/**
 * Fields tab — port of the web FieldsView list mode: search, favorites-first
 * sort, cards with a photo (green pitch gradient fallback), localized name,
 * and district / surface / capacity chips with a favorite star. The grid view
 * and field detail from the web are deferred.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldsScreen(
    container: AppContainer,
    onFieldClick: (String) -> Unit,
    onSubmitField: () -> Unit,
) {
    val viewModel: FieldsViewModel = viewModel { FieldsViewModel(container.fieldsRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isTurkmen = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language == "tk"

    // So a field approved while the user was away (or on the submit form)
    // appears without a manual pull — see FieldsViewModel.refreshOnEnter.
    LaunchedEffect(Unit) { viewModel.refreshOnEnter() }

    val districts = remember(state.fields) { FieldsViewModel.districtsOf(state.fields) }
    val visible = remember(state.fields, state.query, state.district, state.surface, isTurkmen) {
        FieldsViewModel.filterAndSort(
            state.fields, state.query, isTurkmen, state.district, state.surface,
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 12.dp),
        ) {
            Text(
                text = stringResource(R.string.nav_fields),
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.weight(1f),
            )
            // Same 44.dp filled-circle affordance as Teams' create button.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onSubmitField),
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = stringResource(R.string.fields_submit),
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
        OutlinedTextField(
            value = state.query,
            onValueChange = viewModel::onQueryChange,
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            placeholder = { Text(stringResource(R.string.fields_search_placeholder)) },
            singleLine = true,
            shape = RoundedCornerShape(999.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            ),
            modifier = Modifier.fillMaxWidth(),
        )

        // District chips: one per distinct district in the loaded fields, plus a
        // surface chip row — both single-select, tapping the active one clears it.
        if (districts.isNotEmpty()) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(top = 12.dp),
            ) {
                districts.forEach { d ->
                    FilterChip(
                        label = d,
                        active = state.district == d,
                        onClick = { viewModel.onDistrictToggle(d) },
                    )
                }
            }
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(top = 8.dp),
        ) {
            FieldsViewModel.SURFACES.forEach { s ->
                FilterChip(
                    label = surfaceLabel(s),
                    active = state.surface == s,
                    onClick = { viewModel.onSurfaceToggle(s) },
                )
            }
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::pullRefresh,
            modifier = Modifier
                .weight(1f)
                .padding(top = 12.dp),
        ) {
            if (!state.loading && visible.isEmpty()) {
                NoResults()
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 16.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(visible, key = { it.id }) { field ->
                        FieldCard(
                            field = field,
                            isTurkmen = isTurkmen,
                            onToggleFavorite = { viewModel.toggleFavorite(field.id) },
                            onClick = { onFieldClick(field.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FieldCard(
    field: FieldCardDto,
    isTurkmen: Boolean,
    onToggleFavorite: () -> Unit,
    onClick: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface)
            .clickable(onClick = onClick),
    ) {
        // Photo banner with a green-pitch gradient fallback, like the web card.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(96.dp)
                .background(
                    Brush.linearGradient(listOf(MeydanTheme.colors.pitchTop, MeydanTheme.colors.pitchBottom)),
                ),
        ) {
            if (field.photo != null) {
                AsyncImage(
                    model = field.photo,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            // Favorite star, top-right over the banner. 48.dp hit area (Material
            // minimum) with the 36.dp scrim disc drawn inside it.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(48.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onToggleFavorite),
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.45f)),
                ) {
                    Icon(
                        imageVector = if (field.favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                        contentDescription = stringResource(R.string.fields_favorites),
                        tint = if (field.favorite) MeydanTheme.colors.warning else Color.White,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
        Column(modifier = Modifier.padding(horizontal = 15.dp, vertical = 13.dp)) {
            Text(
                text = FieldsViewModel.displayName(field, isTurkmen),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 10.dp),
            ) {
                Chip(field.district)
                Chip(surfaceLabel(field.surface))
                Chip(stringResource(R.string.fields_capacity_chip, field.capacity))
            }
        }
    }
}

/** Rounded pill filter chip — primary tint when active, matching GamesScreen. */
@Composable
private fun FilterChip(label: String, active: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    // Same selected recipe as the games feed: tonal fill + accent outline +
    // bolder accent label.
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(
                if (active) colors.primary.copy(alpha = 0.16f) else colors.surfaceVariant,
            )
            .border(
                width = if (active) 1.5.dp else 1.dp,
                color = if (active) colors.primary else colors.outline,
                shape = RoundedCornerShape(999.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
            color = if (active) colors.primary else colors.onSurfaceVariant,
        )
    }
}

@Composable
private fun Chip(text: String) {
    Text(
        text = text,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
        modifier = Modifier
            .clip(RoundedCornerShape(7.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(horizontal = 9.dp, vertical = 4.dp),
    )
}

@Composable
private fun NoResults() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxSize()
            .padding(40.dp),
    ) {
        Text(
            text = stringResource(R.string.fields_no_results),
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            text = stringResource(R.string.fields_no_results_sub),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}

/**
 * The three known surface strings map to localized labels; unknowns pass
 * through. Internal (not private) so feature/submitfield reuses the exact
 * same mapping rather than drifting from it.
 */
@Composable
internal fun surfaceLabel(surface: String): String = when (surface) {
    "Искусственная трава" -> stringResource(R.string.fields_surface_turf)
    "Резиновое" -> stringResource(R.string.fields_surface_rubber)
    "Грунт" -> stringResource(R.string.fields_surface_dirt)
    else -> surface
}

