package com.meydan.app.feature.fields

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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

/**
 * Fields tab — port of the web FieldsView list mode: search, favorites-first
 * sort, cards with a photo (green pitch gradient fallback), localized name,
 * and district / surface / capacity chips with a favorite star. The grid view
 * and field detail from the web are deferred.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldsScreen(container: AppContainer) {
    val viewModel: FieldsViewModel = viewModel { FieldsViewModel(container.fieldsRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isTurkmen = ConfigurationCompat.getLocales(LocalConfiguration.current)
        .get(0)?.language == "tk"

    val visible = remember(state.fields, state.query, isTurkmen) {
        FieldsViewModel.filterAndSort(state.fields, state.query, isTurkmen)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(horizontal = 24.dp),
    ) {
        Text(
            text = stringResource(R.string.nav_fields),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(top = 16.dp, bottom = 12.dp),
        )
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
) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface),
    ) {
        // Photo banner with a green-pitch gradient fallback, like the web card.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(96.dp)
                .background(
                    Brush.linearGradient(listOf(Color(0xFF1C7A45), Color(0xFF0F5530))),
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
            // Favorite star, top-right over the banner.
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(10.dp)
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.45f))
                    .clickable(onClick = onToggleFavorite),
            ) {
                Icon(
                    imageVector = if (field.favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                    contentDescription = null,
                    tint = if (field.favorite) Color(0xFFF59E0B) else Color.White,
                    modifier = Modifier.size(20.dp),
                )
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

/** The three known surface strings map to localized labels; unknowns pass through. */
@Composable
private fun surfaceLabel(surface: String): String = when (surface) {
    "Искусственная трава" -> stringResource(R.string.fields_surface_turf)
    "Резиновое" -> stringResource(R.string.fields_surface_rubber)
    "Грунт" -> stringResource(R.string.fields_surface_dirt)
    else -> surface
}

