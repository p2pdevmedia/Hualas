package com.hualas.mobile.core.session

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart

class AppSessionStateObserver(
    private val sessionStore: SessionStore
) {
    fun states(): Flow<AppSessionState> {
        return sessionStore.session
            .map { session ->
                if (session == null) {
                    AppSessionState.Unauthenticated
                } else {
                    AppSessionState.Authenticated(session)
                }
            }
            .onStart { emit(AppSessionState.Loading) }
    }
}
