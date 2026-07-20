package com.meydan.app.feature.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meydan.app.R
import com.meydan.app.core.designsystem.PhoneTextField
import com.meydan.app.core.designsystem.PrimaryButton

/**
 * Phone + password form. Port of login/phone/PhoneLoginForm.tsx: +993 prefix,
 * "65 12 34 56" grouping, password with a 6-char minimum, localized errors.
 */
@Composable
fun PhoneLoginScreen(
    viewModel: LoginViewModel,
    onBack: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val configuration = LocalConfiguration.current
    // The device/app language drives the locale sent on signup, like the web
    // form posts its current locale.
    val languageTag = ConfigurationCompat.getLocales(configuration).get(0)?.toLanguageTag() ?: "ru"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .imePadding()
            .padding(horizontal = 28.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(top = 8.dp),
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = MaterialTheme.colorScheme.onBackground,
                )
            }
        }

        Text(
            text = stringResource(R.string.auth_phone_title),
            style = MaterialTheme.typography.headlineLarge,
            modifier = Modifier.padding(top = 16.dp),
        )
        Text(
            text = stringResource(R.string.auth_phone_sub),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )

        Spacer(Modifier.height(32.dp))

        Text(
            text = stringResource(R.string.auth_phone_label),
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        PhoneTextField(
            digits = state.phone,
            onDigitsChange = viewModel::onPhoneChange,
            placeholder = stringResource(R.string.auth_phone_placeholder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
        )

        Spacer(Modifier.height(14.dp))

        Text(
            text = stringResource(R.string.auth_password_label),
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            placeholder = { Text("••••••••") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            shape = MaterialTheme.shapes.large,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
        )

        state.errorCode?.let { code ->
            Text(
                text = stringResource(errorTextRes(code)),
                color = MaterialTheme.colorScheme.error,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 14.dp),
            )
        }

        Spacer(Modifier.weight(1f))

        Column(modifier = Modifier.padding(bottom = 48.dp)) {
            PrimaryButton(
                text = stringResource(R.string.auth_login),
                loading = state.loading,
                onClick = { viewModel.submitPhone(languageTag) },
            )
        }
    }
}
