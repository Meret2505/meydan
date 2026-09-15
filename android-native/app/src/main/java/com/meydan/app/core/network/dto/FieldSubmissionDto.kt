package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable

// --- Field submissions (player-submitted fields, admin-moderated) ---

/** Mirrors PublicUserDto in lib/api/serializers/user.ts — another user as seen by an admin. */
@Serializable
data class PublicUserDto(
    val id: String,
    val name: String,
    val avatar: String? = null,
    val position: String? = null,
    val skillLevel: String,
    val district: String? = null,
)

/** Body of POST /field-submissions. */
@Serializable
data class CreateFieldSubmissionRequest(
    val name: String,
    val address: String,
    val district: String,
    val surface: String,
    val capacity: Int,
    val phone: String? = null,
    val description: String? = null,
)

/** Response of POST /field-submissions. */
@Serializable
data class CreateSubmissionResponse(
    val id: String,
    val status: String,
)

/** Response of POST /field-submissions/{id}/photos. */
@Serializable
data class SubmissionPhotosResponse(
    val photos: List<String> = emptyList(),
)

/** One row in the admin moderation queue — mirrors FieldSubmissionDto on the server. */
@Serializable
data class FieldSubmissionDto(
    val id: String,
    val name: String,
    val address: String,
    val district: String,
    val surface: String,
    val capacity: Int,
    val phone: String? = null,
    val description: String? = null,
    val photos: List<String> = emptyList(),
    val status: String,
    val createdAt: String,
    val submittedBy: PublicUserDto,
)

/** Response of GET /admin/field-submissions. */
@Serializable
data class FieldSubmissionsResponse(
    val submissions: List<FieldSubmissionDto> = emptyList(),
)

/** Response of POST /admin/field-submissions/{id}/approve. */
@Serializable
data class ApproveSubmissionResponse(
    val fieldId: String,
)

/** Body of POST /admin/field-submissions/{id}/reject. */
@Serializable
data class RejectSubmissionRequest(
    val reason: String? = null,
)
