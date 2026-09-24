package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json

/**
 * One file for every cached API response.
 *
 * There were four, one per tab, each with its own `preferencesDataStore` and
 * its own copy of the same twenty lines. Four files means four handles, four
 * reads and four writes on paths that are already the slow part of a cold
 * start, for four blobs that are read and replaced under exactly the same
 * rules.
 */
private val Context.cacheDataStore by preferencesDataStore(name = "meydan_cache")

/**
 * A cached value and the moment it was stored.
 *
 * The timestamp is the part that was missing. The app is offline-first: it
 * draws the cache immediately and refreshes behind it, so on a dead connection
 * what is on screen is whatever was last saved — and nothing said how long ago
 * that was. A feed from last Tuesday looked exactly like a feed from a minute
 * ago, which is the one thing a football listing must not do.
 */
data class Cached<T>(val value: T, val savedAt: Long)

/**
 * One cached response, as JSON, under [name] in the shared file.
 *
 * Deliberately not Room: these are small lists replaced wholesale on every
 * refresh — nothing relational to query — and Room would drag in KSP, whose
 * version must track the Kotlin compiler exactly (the same toolchain-fragility
 * reason AppContainer avoids Hilt).
 */
class JsonCache<T>(
    private val context: Context,
    name: String,
    private val serializer: KSerializer<T>,
    /** Injectable so a caller can pin time; the app uses the wall clock. */
    private val now: () -> Long = System::currentTimeMillis,
) {
    private val valueKey = stringPreferencesKey("${name}_json")
    private val savedAtKey = longPreferencesKey("${name}_saved_at")
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun load(): Cached<T>? {
        val prefs = context.cacheDataStore.data.first()
        val stored = prefs[valueKey] ?: return null
        // Both keys are written together, so one without the other is a torn
        // write or a half-migrated entry. An unknown age is not a usable
        // cache — the whole point is being able to say how old it is.
        val savedAt = prefs[savedAtKey] ?: return null
        return try {
            Cached(json.decodeFromString(serializer, stored), savedAt)
        } catch (e: Exception) {
            null // schema drift after an upgrade — treat as no cache
        }
    }

    suspend fun save(value: T) {
        val encoded = json.encodeToString(serializer, value)
        context.cacheDataStore.edit {
            it[valueKey] = encoded
            it[savedAtKey] = now()
        }
    }

    /** Removes this entry only — the file now belongs to every cache. */
    suspend fun clear() {
        context.cacheDataStore.edit {
            it.remove(valueKey)
            it.remove(savedAtKey)
        }
    }
}
