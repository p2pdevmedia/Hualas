package com.hualas.mobile.core.session

data class MobileSession(
    val token: String,
    val userId: String,
    val activeRole: MobileRole,
    val allowedRoles: Set<MobileRole>,
    val expiresAt: String?
)
