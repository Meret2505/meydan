package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.meydan.app.core.network.dto.UserDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

private val Context.userDataStore by preferencesDataStore(name = "meydan_user")

/**
 * The last-known profile of the signed-in user, persisted as JSON.
 *
 * Exists so a cold start can route (login vs onboarding vs home) and render the
 * profile without waiting on the network — the offline-first requirement.
 * Refreshed from every auth/me response; cleared on logout.
 */
class UserCache(private val context: Context) {

    private val key = stringPreferencesKey("user_json")
    private val json = Json { ignoreUnknownKeys = true }

    val user: Flow<UserDto?> = context.userDataStore.data.map { prefs ->
        prefs[key]?.let { stored ->
            try {
                json.decodeFromString<UserDto>(stored)
            } catch (e: Exception) {
                null // schema drift on upgrade — treat as no cache, refetch
            }
        }
    }

    suspend fun current(): UserDto? = user.first()

    suspend fun save(user: UserDto) {
        val encoded = json.encodeToString(UserDto.serializer(), user)
        context.userDataStore.edit { it[key] = encoded }
    }

    suspend fun clear() {
        context.userDataStore.edit { it.clear() }
    }
}
