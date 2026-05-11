package com.hualas.mobile.features.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface MobileAuthService {
    @POST("api/mobile/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/mobile/me")
    suspend fun me(): Response<MeResponse>

    @POST("api/mobile/auth/logout")
    suspend fun logout(): Response<LogoutResponse>

    @POST("api/mobile/auth/switch-role")
    suspend fun switchRole(@Body request: SwitchRoleRequest): Response<SwitchRoleResponse>
}
