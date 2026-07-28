package com.meydan.app.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.meydan.app.core.network.dto.FieldCardDto
import kotlinx.coroutines.flow.first
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val Context.fieldsDataStore by preferencesDataStore(name = "meydan_fields")

/**
 * The fields catalogue, cached as JSON for offline-first display — same
 * rationale as FeedCache (small list, replaced wholesale, no relational
 * queries, so DataStore over Room).
 */
class FieldsCache(private val context: Context) {

    private val key = stringPreferencesKey("fields_json")
    private val json = Json { ignoreUnknownKeys = true }
    private val serializer = ListSerializer(FieldCardDto.serializer())

    suspend fun load(): List<FieldCardDto>? {
        val stored = context.fieldsDataStore.data.first()[key] ?: return null
        return try {
            json.decodeFromString(serializer, stored)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun save(fields: List<FieldCardDto>) {
        context.fieldsDataStore.edit { it[key] = json.encodeToString(serializer, fields) }
    }

    suspend fun clear() {
        context.fieldsDataStore.edit { it.clear() }
    }
}
