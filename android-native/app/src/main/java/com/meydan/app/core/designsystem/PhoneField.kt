package com.meydan.app.core.designsystem

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

/**
 * The +993 phone input shared by login and onboarding: fixed country prefix,
 * digits-only value grouped as "65 12 34 56". The caller owns the state and
 * receives at most 8 digits.
 */
@Composable
fun PhoneTextField(
    digits: String,
    onDigitsChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = digits,
        onValueChange = { raw -> onDigitsChange(raw.filter { it.isDigit() }.take(8)) },
        leadingIcon = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.width(14.dp))
                Text(
                    text = "+993",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(10.dp))
                VerticalDivider(modifier = Modifier.height(20.dp))
            }
        },
        placeholder = { Text(placeholder) },
        visualTransformation = PhoneGroupingTransformation,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        singleLine = true,
        shape = MaterialTheme.shapes.large,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        ),
        modifier = modifier,
    )
}

private val PhoneGroupingTransformation = VisualTransformation { text ->
    val grouped = text.text.chunked(2).joinToString(" ")
    TransformedText(
        AnnotatedString(grouped),
        object : OffsetMapping {
            override fun originalToTransformed(offset: Int) =
                phoneOriginalToTransformed(offset)

            override fun transformedToOriginal(offset: Int) =
                phoneTransformedToOriginal(offset)
        },
    )
}

// o digits precede the cursor, forming (o-1)/2 completed pairs, each of which
// added one space: "6512" (o=3) -> "65 1". Kept as pure top-level functions so
// the mapping is unit-testable — an inconsistent OffsetMapping crashes the
// field at runtime on cursor movement.
internal fun phoneOriginalToTransformed(offset: Int): Int =
    if (offset <= 0) 0 else offset + (offset - 1) / 2

// Every third transformed character is a space; drop them.
internal fun phoneTransformedToOriginal(offset: Int): Int =
    if (offset <= 0) 0 else offset - offset / 3
