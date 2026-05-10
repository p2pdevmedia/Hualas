package com.hualas.mobile.core.navigation

sealed class AppRoute(val path: String) {
    data object Login : AppRoute("login")
    data object Home : AppRoute("home")
}
