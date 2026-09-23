package com.meydan.app.data

import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.common.apiCall
import com.meydan.app.core.network.MeydanApi
import com.meydan.app.core.network.dto.ApproveSubmissionResponse
import com.meydan.app.core.network.dto.CreateFieldSubmissionRequest
import com.meydan.app.core.network.dto.CreateSubmissionResponse
import com.meydan.app.core.network.dto.FieldSubmissionDto
import com.meydan.app.core.network.dto.RejectSubmissionRequest
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Player field submissions: create + photo upload for any signed-in user, the
 * moderation queue and its two verdicts for admins only. No offline cache —
 * unlike games/teams/fields this isn't a browsing surface, so there's nothing
 * worth showing stale.
 */
class FieldSubmissionsRepository(
    private val api: MeydanApi,
) {
    /**
     * [idempotencyKey] makes a retry of a lost response replay rather than
     * queue a second submission for review — see SubmitKey.
     */
    suspend fun create(
        req: CreateFieldSubmissionRequest,
        idempotencyKey: String,
    ): ApiResult<CreateSubmissionResponse> =
        apiCall { api.createFieldSubmission(idempotencyKey, req) }

    suspend fun addPhoto(
        submissionId: String,
        bytes: ByteArray,
        mime: String,
        filename: String,
    ): ApiResult<List<String>> {
        val part = MultipartBody.Part.createFormData(
            "file",
            filename,
            bytes.toRequestBody(mime.toMediaTypeOrNull()),
        )
        val result = apiCall { api.addSubmissionPhoto(submissionId, part) }
        return when (result) {
            is ApiResult.Success -> ApiResult.Success(result.data.photos)
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }
    }

    suspend fun listPending(): ApiResult<List<FieldSubmissionDto>> {
        val result = apiCall { api.getPendingFieldSubmissions() }
        return when (result) {
            is ApiResult.Success -> ApiResult.Success(result.data.submissions)
            is ApiResult.Failure -> result
            ApiResult.NetworkError -> ApiResult.NetworkError
        }
    }

    suspend fun approve(submissionId: String): ApiResult<ApproveSubmissionResponse> =
        apiCall { api.approveFieldSubmission(submissionId) }

    suspend fun reject(submissionId: String, reason: String?): ApiResult<Unit> =
        apiCall { api.rejectFieldSubmission(submissionId, RejectSubmissionRequest(reason)) }
}
