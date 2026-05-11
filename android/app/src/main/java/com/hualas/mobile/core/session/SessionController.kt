package com.hualas.mobile.core.session

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class SessionController(
    private val sessionStore: SessionStore,
    private val scope: CoroutineScope
) {
    @Volatile
    private var cachedSession: MobileSession? = null

    init {
        scope.launch {
            sessionStore.session.collect { session ->
                cachedSession = session
            }
        }
    }

    fun currentToken(): String? = cachedSession?.token

    fun invalidateSession() {
        cachedSession = null
        scope.launch {
            sessionStore.clear()
        }
    }
}
