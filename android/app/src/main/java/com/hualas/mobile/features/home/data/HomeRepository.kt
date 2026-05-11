package com.hualas.mobile.features.home.data

import com.hualas.mobile.core.network.ApiResult

interface HomeRepository {
    suspend fun loadHome(): ApiResult<HomeSummary>
}
