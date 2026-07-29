package com.meydan.app.feature.fielddetail

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.meydan.app.R
import com.meydan.app.core.common.DetailViewModel
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.FieldDetailDto
import com.meydan.app.core.network.dto.FieldHoursDto
import com.meydan.app.feature.detail.DetailBackButton
import com.meydan.app.feature.detail.DetailStateBox

/**
 * Field detail — port of fields/[id]/page.tsx: photo (or pitch gradient)
 * header, an info card (address / surface / capacity / games), schedule,
 * amenities, and contacts with tel: dialing. The map and photo uploader from
 * the web are out of scope.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FieldDetailScreen(container: AppContainer, fieldId: String, onBack: () -> Unit) {
    val viewModel: DetailViewModel<FieldDetailDto> = viewModel {
        DetailViewModel { container.fieldsRepository.detail(fieldId) }
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DetailStateBox(
        loading = state.loading,
        error = state.error,
        hasData = state.data != null,
        onBack = onBack,
        onRetry = viewModel::retry,
    ) {
        Content(field = state.data!!, onBack = onBack)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Content(field: FieldDetailDto, onBack: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val isTm = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0)?.language == "tk"
    val name = (if (isTm) field.nameTm else field.nameRu) ?: field.name
    val address = (if (isTm) field.addressTm else field.addressRu) ?: field.address

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        // Photo / pitch header.
        Box(modifier = Modifier.fillMaxWidth().height(208.dp)) {
            if (field.photos.isNotEmpty()) {
                AsyncImage(
                    model = field.photos.first(),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.linearGradient(listOf(Color(0xFF1C7A45), Color(0xFF0F5530))),
                    ),
                )
            }
            Box(
                Modifier.fillMaxSize().background(
                    Brush.verticalGradient(0f to Color.Black.copy(alpha = 0.3f), 0.4f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.75f)),
                ),
            )
            DetailBackButton(onBack, Modifier.systemBarsPadding().padding(start = 16.dp, top = 8.dp), onDark = true)
            Column(Modifier.align(Alignment.BottomStart).padding(horizontal = 24.dp, vertical = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = field.surface,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF06210F),
                        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFF1FD16B)).padding(horizontal = 10.dp, vertical = 3.dp),
                    )
                    Text(field.district, color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                }
                Text(name, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 8.dp))
            }
        }

        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(top = 20.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Info card.
            Card {
                InfoRow(stringResource(R.string.fields_address), address, divider = true)
                InfoRow(stringResource(R.string.fields_surface_label), field.surface, divider = true)
                InfoRow(stringResource(R.string.fields_capacity_label), stringResource(R.string.fields_capacity_value, field.capacity), divider = true)
                InfoRow(stringResource(R.string.fields_games_played_label), field.gamesPlayed.toString(), divider = false)
            }

            field.hours?.let { hours ->
                Section(stringResource(R.string.fields_schedule)) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        hours.forEach { HoursRow(it) }
                    }
                }
            }

            if (field.amenities.isNotEmpty()) {
                Section(stringResource(R.string.fields_amenities)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        field.amenities.forEach { a ->
                            Text(
                                text = if (isTm) a.tm else a.ru,
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.onSurface,
                                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(colors.surfaceVariant.copy(alpha = 0.5f)).padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }
            }

            val phone = field.contacts.firstOrNull { it.type == "phone" }?.value
            if (field.contacts.isNotEmpty()) {
                Section(stringResource(R.string.fields_contacts)) {
                    Column {
                        field.contacts.forEach { ContactRow(it.type, it.value) }
                    }
                }
            }
            if (phone != null) CallButton(phone)
        }
    }
}

@Composable
private fun Card(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 16.dp, vertical = 4.dp),
    ) { content() }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
    ) {
        Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 12.dp))
        content()
    }
}

@Composable
private fun InfoRow(label: String, value: String, divider: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 14.5.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End, modifier = Modifier.padding(start = 16.dp))
    }
    if (divider) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun HoursRow(h: FieldHoursDto) {
    val dayRes = when (h.day) {
        "monday" -> R.string.day_monday
        "tuesday" -> R.string.day_tuesday
        "wednesday" -> R.string.day_wednesday
        "thursday" -> R.string.day_thursday
        "friday" -> R.string.day_friday
        "saturday" -> R.string.day_saturday
        else -> R.string.day_sunday
    }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(stringResource(dayRes), fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = if (h.isOpen) "${h.start} – ${h.end}" else stringResource(R.string.fields_closed),
            fontSize = 13.5.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun ContactRow(type: String, value: String) {
    val context = LocalContext.current
    val (icon, display, uri) = when (type) {
        "phone" -> Triple("📞", value, "tel:$value")
        "instagram" -> Triple("📷", "@$value", "https://instagram.com/$value")
        else -> Triple("🎵", "@$value", "https://tiktok.com/@$value")
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(icon, fontSize = 14.sp)
        Text(display, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun CallButton(phone: String) {
    val context = LocalContext.current
    val colors = MaterialTheme.colorScheme
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.primary)
            .clickable { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) },
    ) {
        Text("📞 ${stringResource(R.string.fields_call)}", color = colors.onPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
    }
}
