package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * One field in the fields catalogue, mirroring FieldCardDto in
 * lib/api/serializers/field.ts. Both localized names arrive so the client
 * resolves by its own locale, as the web does.
 */
@Serializable
data class FieldCardDto(
    val id: String,
    val name: String,
    val nameRu: String? = null,
    val nameTm: String? = null,
    val district: String,
    val surface: String,
    /**
     * The surface as a stable key (ARTIFICIAL / RUBBER / DIRT). Nullable with
     * a default so this build still parses a response from a server that has
     * not been deployed yet — and so that `surface`, the Russian label the
     * column used to hold, remains the fallback until it is dropped.
     */
    val surfaceKey: String? = null,
    val capacity: Int,
    val photo: String? = null,
    val favorite: Boolean,
)

@Serializable
data class FieldsResponse(val fields: List<FieldCardDto>)

@Serializable
data class FavoriteResponse(val favorite: Boolean)
