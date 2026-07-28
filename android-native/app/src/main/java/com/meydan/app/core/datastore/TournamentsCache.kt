package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.meydan.app.core.network.dto.TournamentCardDto
import kotlinx.coroutines.flow.first
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val Context.tournamentsDataStore by preferencesDataStore(name = "meydan_tournaments")

/** Offline-first JSON cache for the tournaments tab. */
class TournamentsCache(private val context: Context) {
    private val key = stringPreferencesKey("tournaments_json")
    private val json = Json { ignoreUnknownKeys = true }
    private val serializer = ListSerializer(TournamentCardDto.serializer())

    suspend fun load(): List<TournamentCardDto>? {
        val stored = context.tournamentsDataStore.data.first()[key] ?: return null
        return try {
            json.decodeFromString(serializer, stored)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun save(value: List<TournamentCardDto>) {
        context.tournamentsDataStore.edit { it[key] = json.encodeToString(serializer, value) }
    }

    suspend fun clear() {
        context.tournamentsDataStore.edit { it.clear() }
    }
}
