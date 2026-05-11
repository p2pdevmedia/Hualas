package com.hualas.mobile.features.home.data

import retrofit2.Response
import retrofit2.http.GET

interface MobileHomeService {
    @GET("api/mobile/home")
    suspend fun home(): Response<MobileHomeResponse>
}
