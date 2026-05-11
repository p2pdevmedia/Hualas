package com.hualas.mobile.core.session

sealed interface AppSessionState {
    data object Loading : AppSessionState
    data object Unauthenticated : AppSessionState
    data class Authenticated(val session: MobileSession) : AppSessionState
}
