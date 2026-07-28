package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.meydan.app.core.network.dto.TeamsResponse
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

private val Context.teamsDataStore by preferencesDataStore(name = "meydan_teams")

/** Offline-first JSON cache for the teams tab (same rationale as FeedCache). */
class TeamsCache(private val context: Context) {
    private val key = stringPreferencesKey("teams_json")
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun load(): TeamsResponse? {
        val stored = context.teamsDataStore.data.first()[key] ?: return null
        return try {
            json.decodeFromString(TeamsResponse.serializer(), stored)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun save(value: TeamsResponse) {
        context.teamsDataStore.edit { it[key] = json.encodeToString(TeamsResponse.serializer(), value) }
    }

    suspend fun clear() {
        context.teamsDataStore.edit { it.clear() }
    }
}
