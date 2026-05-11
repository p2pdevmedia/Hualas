package com.hualas.mobile.core.session

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

@OptIn(ExperimentalCoroutinesApi::class)
class AppSessionStateObserverTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var scope: TestScope
    private lateinit var dataStore: androidx.datastore.core.DataStore<Preferences>

    @Before
    fun setUp() {
        scope = TestScope(UnconfinedTestDispatcher() + Job())
        dataStore = PreferenceDataStoreFactory.create(
            scope = scope,
            produceFile = { temporaryFolder.newFile("observer.preferences_pb") }
        )
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun startsLoadingThenEmitsUnauthenticatedWithoutSession() = runTest {
        val states = AppSessionStateObserver(SessionStore(dataStore))
            .states()
            .take(2)
            .toList()

        assertEquals(
            listOf(AppSessionState.Loading, AppSessionState.Unauthenticated),
            states
        )
    }

    @Test
    fun emitsAuthenticatedWhenStoredSessionExists() = runTest {
        val store = SessionStore(dataStore)
        val session = MobileSession(
            token = "mobile-token",
            userId = "user-1",
            activeRole = MobileRole.PROFESSOR,
            allowedRoles = setOf(MobileRole.PROFESSOR),
            expiresAt = null
        )
        store.save(session)

        val states = AppSessionStateObserver(store)
            .states()
            .take(2)
            .toList()

        assertEquals(
            listOf(AppSessionState.Loading, AppSessionState.Authenticated(session)),
            states
        )
    }
}
