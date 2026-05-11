package com.hualas.mobile.features.activities.data

import com.hualas.mobile.core.network.ApiResult

interface ActivitiesRepository {
    suspend fun loadAgenda(day: String? = null): ApiResult<ActivitiesAgenda>
    suspend fun loadAgendaSummary(): ApiResult<ActivitiesAgenda>
    suspend fun loadDayDetail(dayId: String): ApiResult<ActivityDayDetail>
    suspend fun loadAvailableActivities(): ApiResult<AvailableActivities>
    suspend fun quoteCart(items: List<CartItemRequest>): ApiResult<CartQuoteResponse>
    suspend fun startCheckout(items: List<CartItemRequest>): ApiResult<CheckoutResponse>
}
