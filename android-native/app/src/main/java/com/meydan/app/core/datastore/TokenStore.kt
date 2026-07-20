package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore(name = "meydan_tokens")

/**
 * Persists the session tokens.
 *
 * The access token is stored in the clear — it is short-lived (15 minutes) and
 * useless once expired. The refresh token is wrapped with [KeystoreCrypto]
 * before storage because it is a long-lived credential.
 *
 * A single suspend surface (no exposed Flow) keeps the OkHttp Authenticator,
 * which is synchronous, simple: it reads and writes tokens with runBlocking
 * around these calls.
 */
class TokenStore(private val context: Context) : TokenProvider {

    private object Keys {
        val ACCESS = stringPreferencesKey("access_token")
        val REFRESH_ENCRYPTED = stringPreferencesKey("refresh_token_enc")
    }

    override suspend fun save(accessToken: String, refreshToken: String) {
        val wrapped = KeystoreCrypto.encrypt(refreshToken)
        context.dataStore.edit { prefs ->
            prefs[Keys.ACCESS] = accessToken
            prefs[Keys.REFRESH_ENCRYPTED] = wrapped
        }
    }

    /** Updates just the access token, used after a successful refresh. */
    suspend fun updateAccessToken(accessToken: String) {
        context.dataStore.edit { prefs -> prefs[Keys.ACCESS] = accessToken }
    }

    override suspend fun accessToken(): String? =
        context.dataStore.data.first()[Keys.ACCESS]

    override suspend fun refreshToken(): String? {
        val wrapped = context.dataStore.data.first()[Keys.REFRESH_ENCRYPTED] ?: return null
        return KeystoreCrypto.decrypt(wrapped)
    }

    suspend fun hasSession(): Boolean = refreshToken() != null

    override suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
