package com.hualas.mobile.features.activities.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MobileActivitiesService {
    @GET("api/mobile/activities")
    suspend fun agenda(
        @Query("day") day: String? = null,
        @Query("summary") summary: Boolean? = null
    ): Response<MobileActivitiesResponse>

    @GET("api/mobile/activities/{dayId}")
    suspend fun dayDetail(@Path("dayId") dayId: String): Response<ActivityDayDetailResponse>

    @GET("api/mobile/activities/available")
    suspend fun availableActivities(): Response<AvailableActivitiesResponse>

    @POST("api/mobile/activities/cart/quote")
    suspend fun quote(@Body request: CartRequest): Response<CartQuoteResponse>

    @POST("api/mobile/activities/cart/checkout")
    suspend fun checkout(@Body request: CartRequest): Response<CheckoutResponse>
}
