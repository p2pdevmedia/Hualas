package com.hualas.mobile.core.navigation

import com.hualas.mobile.core.session.AppSessionState
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.MobileSession
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AppStartDestinationResolverTest {
    @Test
    fun returnsNoRouteWhileSessionIsLoading() {
        assertNull(startRouteForSessionState(AppSessionState.Loading))
    }

    @Test
    fun routesUnauthenticatedUsersToLogin() {
        assertEquals(AppRoute.Login.path, startRouteForSessionState(AppSessionState.Unauthenticated))
    }

    @Test
    fun routesAuthenticatedUsersToHome() {
        val session = MobileSession(
            token = "token",
            userId = "user-1",
            activeRole = MobileRole.MEMBER,
            allowedRoles = setOf(MobileRole.MEMBER),
            expiresAt = null
        )

        assertEquals(AppRoute.Home.path, startRouteForSessionState(AppSessionState.Authenticated(session)))
    }
}
