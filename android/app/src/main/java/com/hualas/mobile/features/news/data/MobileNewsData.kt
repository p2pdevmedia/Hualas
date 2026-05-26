package com.hualas.mobile.features.news.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface MobileNewsService {
    @GET("api/mobile/news")
    suspend fun news(): Response<MobileNewsResponse>

    @POST("api/mobile/news/read")
    suspend fun markRead(@Body request: MarkNewsReadRequest): Response<MarkNewsReadResponse>
}

class MobileNewsRepository(
    private val service: MobileNewsService
) {
    suspend fun loadNews(): ApiResult<List<MobileNewsItem>> {
        val response = runCatching { service.news() }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> ApiResult.Success(result.value.news.map { it.toModel() })
            else -> result.toNewsError()
        }
    }

    suspend fun markRead(id: String): ApiResult<Unit> {
        val response = runCatching { service.markRead(MarkNewsReadRequest(newsId = id)) }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            else -> result.toNewsError()
        }
    }

    private fun MobileNewsItemDto.toModel() = MobileNewsItem(
        id = id,
        title = title,
        body = body,
        scope = scope,
        activityName = activityName,
        author = author,
        createdAt = createdAt,
        isRead = isRead,
        mediaCount = media.size
    )

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> ApiResult<*>.toNewsError(): ApiResult<T> {
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
data class MobileNewsResponse(
    val news: List<MobileNewsItemDto> = emptyList()
)

@Serializable
data class MobileNewsItemDto(
    val id: String,
    val title: String,
    val body: String,
    val scope: String,
    val activityId: String? = null,
    val activityName: String? = null,
    val author: String,
    val createdAt: String,
    val isRead: Boolean,
    val readAt: String? = null,
    val media: List<MobileNewsMediaDto> = emptyList()
)

@Serializable
data class MobileNewsMediaDto(
    val id: String,
    val url: String,
    val mimeType: String? = null,
    val type: String? = null,
    val fileName: String? = null
)

@Serializable
data class MarkNewsReadRequest(
    val newsId: String
)

@Serializable
data class MarkNewsReadResponse(
    val ok: Boolean = false,
    val updated: Int = 0
)

data class MobileNewsItem(
    val id: String,
    val title: String,
    val body: String,
    val scope: String,
    val activityName: String?,
    val author: String,
    val createdAt: String,
    val isRead: Boolean,
    val mediaCount: Int
)
