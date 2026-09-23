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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.meydan.app.core.common.ImageWidth
import com.meydan.app.core.common.optimizedImageUrl
import com.meydan.app.core.common.DetailViewModel
import com.meydan.app.core.di.AppContainer
import com.meydan.app.core.network.dto.FieldDetailDto
import com.meydan.app.core.network.dto.FieldHoursDto
import com.meydan.app.feature.detail.DetailBackButton
import com.meydan.app.feature.detail.DetailStateBox
import com.meydan.app.core.designsystem.FullscreenImageViewer
import com.meydan.app.core.designsystem.MeydanTheme

/**
 * Field detail — port of fields/[id]/page.tsx: photo (or pitch gradient)
 * header, an info card (address / surface / capacity / games), schedule,
 * amenities, and contacts with tel: dialing. The map and photo uploader from
 * the web are out of scope.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FieldDetailScreen(
    container: AppContainer,
    fieldId: String,
    onBack: () -> Unit,
    onStartGame: () -> Unit,
) {
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
        Content(field = state.data!!, onBack = onBack, onStartGame = onStartGame)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Content(field: FieldDetailDto, onBack: () -> Unit, onStartGame: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val isTm = ConfigurationCompat.getLocales(LocalConfiguration.current).get(0)?.language == "tk"
    val name = (if (isTm) field.nameTm else field.nameRu) ?: field.name
    val address = (if (isTm) field.addressTm else field.addressRu) ?: field.address
    var viewerOpen by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        // Photo / pitch header. Tapping it opens every field photo full-screen,
        // not just the crop shown here.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(208.dp)
                .let { if (field.photos.isNotEmpty()) it.clickable { viewerOpen = true } else it },
        ) {
            if (field.photos.isNotEmpty()) {
                AsyncImage(
                    model = optimizedImageUrl(field.photos.first(), ImageWidth.FULL),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.linearGradient(listOf(MeydanTheme.colors.pitchTop, MeydanTheme.colors.pitchBottom)),
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
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(MaterialTheme.colorScheme.primary).padding(horizontal = 10.dp, vertical = 3.dp),
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

            // About — localized body text; the web may store simple HTML, so
            // strip tags to plain text. Nothing renders when empty.
            val body = stripHtml((if (isTm) field.bodyTm else field.bodyRu).orEmpty())
            if (body.isNotEmpty()) {
                Section(stringResource(R.string.fields_about)) {
                    Text(body, fontSize = 14.sp, color = colors.onSurface.copy(alpha = 0.9f))
                }
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
            if (phone != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CallButton(phone, Modifier.weight(1f))
                    WhatsappButton(phone, Modifier.weight(1f))
                }
            }

            StartGameButton(onStartGame)
        }
    }

    if (viewerOpen) {
        FullscreenImageViewer(
            images = field.photos,
            initialIndex = 0,
            onDismiss = { viewerOpen = false },
        )
    }
}

/** Strip simple HTML from the web-stored body into plain text with paragraph breaks. */
private fun stripHtml(html: String): String =
    html
        .replace(Regex("(?i)<br\\s*/?>"), "\n")
        .replace(Regex("(?i)</p\\s*>"), "\n\n")
        .replace(Regex("<[^>]+>"), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace(Regex("\\n{3,}"), "\n\n")
        .trim()

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
        "phone" -> Triple(Icons.Filled.Call, value, "tel:$value")
        "instagram" -> Triple(Icons.Filled.PhotoCamera, "@$value", "https://instagram.com/$value")
        else -> Triple(Icons.Filled.MusicNote, "@$value", "https://tiktok.com/@$value")
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        Text(display, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun CallButton(phone: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val colors = MaterialTheme.colorScheme
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.primary)
            .clickable { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Icon(imageVector = Icons.Filled.Call, contentDescription = null, tint = colors.onPrimary, modifier = Modifier.size(18.dp))
        Text(stringResource(R.string.fields_call), color = colors.onPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun WhatsappButton(phone: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val colors = MaterialTheme.colorScheme
    val digits = phone.filter { it.isDigit() }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .clickable { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$digits"))) }
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, tint = colors.onSurface, modifier = Modifier.size(18.dp))
        Text(stringResource(R.string.field_whatsapp), color = colors.onSurface, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun StartGameButton(onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(stringResource(R.string.field_start_game), color = colors.onSurface, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}
