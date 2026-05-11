package com.hualas.mobile.features.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val platform: String = "Android",
    val deviceName: String? = null,
    val deviceModel: String? = null,
    val appVersion: String? = null
)

@Serializable
data class SwitchRoleRequest(
    val role: String
)

@Serializable
data class LoginResponse(
    val token: String,
    val session: AuthSessionDto,
    val user: MobileUserDto
)

@Serializable
data class MeResponse(
    val user: MobileUserDto,
    val session: AuthSessionDto
)

@Serializable
data class AuthSessionDto(
    val id: String,
    val appRole: String,
    val expiresAt: String?,
    val lastUsedAt: String? = null
)

@Serializable
data class MobileUserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    val lastName: String? = null,
    val role: String,
    val activeRole: String? = null,
    val mobileRole: String? = null,
    val allowedRoles: List<String>,
    val profilePhoto: String? = null,
    val isActive: Boolean? = null
)

@Serializable
data class LogoutResponse(
    val ok: Boolean
)

@Serializable
data class SwitchRoleResponse(
    val ok: Boolean,
    val appRole: String,
    val allowedRoles: List<String>
)
