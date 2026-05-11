package com.hualas.mobile.core.navigation

import com.hualas.mobile.core.session.AppSessionState

fun startRouteForSessionState(sessionState: AppSessionState): String? {
    return when (sessionState) {
        AppSessionState.Loading -> null
        AppSessionState.Unauthenticated -> AppRoute.Login.path
        is AppSessionState.Authenticated -> AppRoute.Home.path
    }
}
