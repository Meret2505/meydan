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

    /**
     * Whether a refresh token is stored — *without* unwrapping it.
     *
     * This runs before the first frame: the root navigation cannot pick a start
     * destination until it knows, and it used to call [refreshToken], which
     * loads the Android Keystore, initialises a Cipher and does an AES-GCM
     * decrypt to answer a boolean. Timed on its own on the emulator, that
     * decrypt is 48 ms warm and 263 ms on a cold process — all of it before
     * anything is drawn. Nothing here needs the plaintext; the Authenticator
     * asks for that later, off the startup path.
     *
     * The one case this reads differently: a stored token whose Keystore key is
     * gone (the user removed their device lock) now says "yes". The app opens
     * at home, the first authenticated call 401s, the refresh finds no
     * plaintext and the session-expired path returns to login — where the old
     * behaviour went directly. A rare case pays a redirect so that every normal
     * start saves the decrypt.
     */
    suspend fun hasSession(): Boolean =
        context.dataStore.data.first()[Keys.REFRESH_ENCRYPTED] != null

    override suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
