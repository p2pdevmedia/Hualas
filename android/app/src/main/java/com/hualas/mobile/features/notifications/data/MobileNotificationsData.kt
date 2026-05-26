package com.hualas.mobile.features.notifications.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path

interface MobileNotificationsService {
    @GET("api/mobile/notifications")
    suspend fun notifications(): Response<MobileNotificationsResponse>

    @PATCH("api/mobile/notifications/{id}")
    suspend fun markRead(@Path("id") id: String): Response<MarkNotificationReadResponse>
}

class MobileNotificationsRepository(
    private val service: MobileNotificationsService
) {
    suspend fun loadNotifications(): ApiResult<MobileNotificationsInbox> {
        val response = runCatching { service.notifications() }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> ApiResult.Success(result.value.toModel())
            else -> result.toNotificationsError()
        }
    }

    suspend fun markRead(id: String): ApiResult<Unit> {
        val response = runCatching { service.markRead(id) }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            else -> result.toNotificationsError()
        }
    }

    private fun MobileNotificationsResponse.toModel() = MobileNotificationsInbox(
        notifications = notifications.map {
            MobileNotificationItem(
                id = it.id,
                type = it.type,
                title = it.title,
                body = it.body,
                url = it.url,
                readAt = it.readAt,
                createdAt = it.createdAt
            )
        },
        unreadCount = unreadCount,
        chatUnreadCount = chatUnreadCount
    )

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> ApiResult<*>.toNotificationsError(): ApiResult<T> {
        return when (this) {
            is ApiResult.Success -> error("Success must be handled before mapping errors")
            is ApiResult.ValidationError -> this
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Forbidden -> ApiResult.Forbidden
            ApiResult.NotFound -> ApiResult.NotFound
            is ApiResult.ServerError -> this
            is ApiResult.NetworkFailure -> this
        }
    }
}

@Serializable
data class MobileNotificationsResponse(
    val notifications: List<MobileNotificationDto> = emptyList(),
    val unreadCount: Int = 0,
    val chatUnreadCount: Int = 0
)

@Serializable
data class MobileNotificationDto(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val url: String? = null,
    val readAt: String? = null,
    val createdAt: String
)

@Serializable
data class MarkNotificationReadResponse(
    val ok: Boolean = false
)

data class MobileNotificationsInbox(
    val notifications: List<MobileNotificationItem>,
    val unreadCount: Int,
    val chatUnreadCount: Int
)

data class MobileNotificationItem(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val url: String?,
    val readAt: String?,
    val createdAt: String
)
