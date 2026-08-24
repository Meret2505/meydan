package com.meydan.app.core.network.dto

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * One notification, mirroring the GET /api/v1/notifications item shape. [type]
 * arrives as the raw enum string (e.g. "GAME_INVITE") and [data] is the model's
 * free-form JSON payload — kept as a JsonObject so the screen can read
 * type-specific keys like `gameId` without the client modelling every variant.
 */
@Serializable
data class NotificationDto(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val data: JsonObject? = null,
    val isRead: Boolean,
    val createdAt: String,
)

/** GET /api/v1/notifications payload: the list plus the badge count. */
@Serializable
data class NotificationsDto(
    val notifications: List<NotificationDto>,
    val unreadCount: Int,
)
