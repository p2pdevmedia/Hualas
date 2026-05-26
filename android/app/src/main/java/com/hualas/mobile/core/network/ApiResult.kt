package com.hualas.mobile.core.network

sealed interface ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>
    data class ValidationError(val message: String) : ApiResult<Nothing>
    data object Unauthorized : ApiResult<Nothing>
    data object Forbidden : ApiResult<Nothing>
    data object NotFound : ApiResult<Nothing>
    data class ServerError(val message: String) : ApiResult<Nothing>
    data class NetworkFailure(val message: String) : ApiResult<Nothing>

    companion object {
        fun fromThrowable(throwable: Throwable): ApiResult<Nothing> {
            return NetworkFailure(throwable.message ?: "No se pudo conectar con Hualas.")
        }
    }
}
