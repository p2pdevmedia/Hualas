package com.hualas.mobile.features.auth.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.MobileSession
import com.hualas.mobile.core.session.SessionStore
import java.io.IOException

class MobileAuthRepository(
    private val service: MobileAuthService,
    private val sessionStore: SessionStore,
    private val tokenProvider: () -> String?
) : AuthRepository {
    override suspend fun login(email: String, password: String): ApiResult<MobileSession> {
        val response = runCatching {
            service.login(
                LoginRequest(
                    email = email.trim(),
                    password = password,
                    platform = "Android"
                )
            )
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> saveSession(
                token = result.value.token,
                user = result.value.user,
                session = result.value.session
            )
            else -> result.toSessionError()
        }
    }

    override suspend fun restore(): ApiResult<MobileSession> {
        val token = tokenProvider() ?: sessionStore.currentSession()?.token
        if (token.isNullOrBlank()) {
            return ApiResult.Unauthorized
        }

        val response = runCatching { service.me() }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> saveSession(
                token = token,
                user = result.value.user,
                session = result.value.session
            )
            else -> result.toSessionError()
        }
    }

    override suspend fun logout() {
        runCatching { service.logout() }
        sessionStore.clear()
    }

    override suspend fun switchRole(role: MobileRole): ApiResult<MobileSession> {
        val currentSession = sessionStore.currentSession()
            ?: return ApiResult.Unauthorized

        val response = runCatching {
            service.switchRole(SwitchRoleRequest(role = role.name))
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                val updated = currentSession.copy(
                    activeRole = result.value.appRole.toMobileRole(),
                    allowedRoles = result.value.allowedRoles.toMobileRoleSet()
                )
                sessionStore.save(updated)
                ApiResult.Success(updated)
            }
            else -> result.toSessionError()
        }
    }

    private suspend fun saveSession(
        token: String,
        user: MobileUserDto,
        session: AuthSessionDto
    ): ApiResult<MobileSession> {
        val mobileSession = MobileSession(
            token = token,
            userId = user.id,
            activeRole = session.appRole.toMobileRole(),
            allowedRoles = user.allowedRoles.toMobileRoleSet(),
            expiresAt = session.expiresAt
        )
        sessionStore.save(mobileSession)
        return ApiResult.Success(mobileSession)
    }

    private fun String.toMobileRole(): MobileRole {
        return MobileRole.valueOf(this)
    }

    private fun List<String>.toMobileRoleSet(): Set<MobileRole> {
        return mapNotNull { role ->
            runCatching { MobileRole.valueOf(role) }.getOrNull()
        }.toSet()
    }

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return if (this is IOException) {
            toApiResult()
        } else {
            ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
        }
    }

    private fun ApiResult<*>.toSessionError(): ApiResult<MobileSession> {
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
