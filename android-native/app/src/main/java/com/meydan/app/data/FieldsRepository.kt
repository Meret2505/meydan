package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.datastore.Cached
import com.meydan.app.core.datastore.JsonCache
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.FieldCardDto
import com.meydan.app.core.network.dto.FieldDetailDto

/**
 * Fields catalogue with the same offline-first read path as games: cached list
 * first, network refresh second. Favorite toggles go straight to the server;
 * the ViewModel updates its in-memory copy optimistically.
 */
class FieldsRepository(
    private val api: MeydanApi,
    private val fieldsCache: JsonCache<List<FieldCardDto>>,
) {
    /** The stored catalogue and when it was stored; null if never. */
    suspend fun cached(): Cached<List<FieldCardDto>>? = fieldsCache.load()

    suspend fun refresh(): ApiResult<List<FieldCardDto>> {
        val result = apiCall { api.getFields() }
        return when (result) {
            is ApiResult.Success -> {
                fieldsCache.save(result.data.fields)
                ApiResult.Success(result.data.fields)
            }
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }
    }

    suspend fun setFavorite(fieldId: String, favorite: Boolean): ApiResult<Boolean> {
        val result = apiCall {
            if (favorite) api.favoriteField(fieldId) else api.unfavoriteField(fieldId)
        }
        return when (result) {
            is ApiResult.Success -> ApiResult.Success(result.data.favorite)
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }
    }

    suspend fun detail(id: String): ApiResult<FieldDetailDto> =
        apiCall { api.getFieldDetail(id) }

    suspend fun clearCache() = fieldsCache.clear()
}
