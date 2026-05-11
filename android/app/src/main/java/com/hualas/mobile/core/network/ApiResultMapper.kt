package com.hualas.mobile.core.network

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.Response
import java.io.IOException

private val errorJson = Json { ignoreUnknownKeys = true }

fun <T> Response<T>.toApiResult(): ApiResult<T> {
    if (isSuccessful) {
        val responseBody = body()
        return if (responseBody != null) {
            ApiResult.Success(responseBody)
        } else {
            ApiResult.ServerError("La respuesta del servidor vino vacía")
        }
    }

    return when (code()) {
        400, 422 -> ApiResult.ValidationError(errorMessage())
        401 -> ApiResult.Unauthorized
        403 -> ApiResult.Forbidden
        404 -> ApiResult.NotFound
        else -> ApiResult.ServerError(errorMessage())
    }
}

fun IOException.toApiResult(): ApiResult.NetworkFailure {
    return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
}

private fun <T> Response<T>.errorMessage(): String {
    val rawBody = errorBody()?.string().orEmpty()
    if (rawBody.isBlank()) {
        return "No se pudo completar la solicitud"
    }

    return runCatching {
        val payload = errorJson.parseToJsonElement(rawBody).jsonObject
        payload["error"]?.jsonPrimitive?.content
            ?: payload["message"]?.jsonPrimitive?.content
            ?: "No se pudo completar la solicitud"
    }.getOrDefault("No se pudo completar la solicitud")
}
