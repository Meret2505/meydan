package com.meydan.app.core.designsystem

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.meydan.app.R

/**
 * The single way out of a guarded form. Call [requestExit] from the toolbar
 * arrow instead of the screen's own `onBack`.
 */
class ExitGuard internal constructor(val requestExit: () -> Unit)

/**
 * Asks before throwing away a half-filled form.
 *
 * A form lives on its own back-stack entry, so leaving it clears its ViewModel
 * and every typed character with it — and on a phone the back *gesture* sits
 * under the thumb that is also scrolling the form. Losing a pitch description
 * someone spent two minutes on to a stray swipe is silent and unrecoverable,
 * which is exactly the kind of loss a confirmation is for.
 *
 * Both exits route through the returned guard so they cannot disagree. The
 * [BackHandler] is enabled *only* while there is something to lose: a disabled
 * handler leaves Back with its normal meaning, so an untouched form still
 * closes on the first press with no dialog in the way.
 */
@Composable
fun rememberExitGuard(hasUnsavedInput: Boolean, onExit: () -> Unit): ExitGuard {
    val asking = remember { mutableStateOf(false) }

    BackHandler(enabled = hasUnsavedInput) { asking.value = true }

    if (asking.value) {
        DiscardChangesDialog(
            onConfirm = {
                asking.value = false
                onExit()
            },
            onDismiss = { asking.value = false },
        )
    }

    return remember(hasUnsavedInput, onExit) {
        ExitGuard(
            requestExit = { if (hasUnsavedInput) asking.value = true else onExit() },
        )
    }
}

/** Confirmation for discarding typed input. Leaving is the destructive side. */
@Composable
private fun DiscardChangesDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    AlertDialog(
        onDismissRequest = onDismiss,
        // Explicit: M3 defaults a dialog's container to shapes.extraLarge, which
        // this theme defines as a 999dp pill for buttons — that renders the
        // dialog as an oval. 28dp is the M3 dialog corner radius.
        shape = RoundedCornerShape(28.dp),
        title = { Text(stringResource(R.string.form_discard_title)) },
        text = { Text(stringResource(R.string.form_discard_body)) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    text = stringResource(R.string.form_discard_confirm),
                    color = colors.error,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.form_discard_dismiss))
            }
        },
    )
}
