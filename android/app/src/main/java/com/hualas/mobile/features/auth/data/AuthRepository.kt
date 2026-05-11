package com.hualas.mobile.features.auth.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.MobileSession

interface AuthRepository {
    suspend fun login(email: String, password: String): ApiResult<MobileSession>
    suspend fun restore(): ApiResult<MobileSession>
    suspend fun logout()
    suspend fun switchRole(role: MobileRole): ApiResult<MobileSession>
}
