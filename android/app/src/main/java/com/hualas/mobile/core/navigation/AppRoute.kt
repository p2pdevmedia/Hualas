package com.hualas.mobile.core.navigation

sealed class AppRoute(val path: String) {
    data object Login : AppRoute("login")
    data object Home : AppRoute("home")
    data object Cart : AppRoute("activities/cart")

    data object PurchaseDetail : AppRoute("activities/purchase/{activityId}") {
        const val ARG_ACTIVITY_ID = "activityId"

        fun path(activityId: String): String = "activities/purchase/$activityId"
    }
}
