package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.meydan.app.core.network.dto.GamesFeedDto
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

private val Context.feedDataStore by preferencesDataStore(name = "meydan_feed")

/**
 * The last games feed the server returned, persisted as JSON.
 *
 * Deliberately not Room: the feed is a small list replaced wholesale on every
 * refresh — there is nothing relational to query — and Room would drag in KSP,
 * whose version must track the Kotlin compiler exactly (the same
 * toolchain-fragility reason AppContainer avoids Hilt). One JSON blob in
 * DataStore gives the same offline-first behaviour with none of that.
 */
class FeedCache(private val context: Context) {

    private val key = stringPreferencesKey("feed_json")
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun load(): GamesFeedDto? {
        val stored = context.feedDataStore.data.first()[key] ?: return null
        return try {
            json.decodeFromString<GamesFeedDto>(stored)
        } catch (e: Exception) {
            null // schema drift after an upgrade — treat as no cache
        }
    }

    suspend fun save(feed: GamesFeedDto) {
        val encoded = json.encodeToString(GamesFeedDto.serializer(), feed)
        context.feedDataStore.edit { it[key] = encoded }
    }

    suspend fun clear() {
        context.feedDataStore.edit { it.clear() }
    }
}
