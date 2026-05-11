package com.hualas.mobile.core.session

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

@OptIn(ExperimentalCoroutinesApi::class)
class SessionControllerTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var scope: TestScope
    private lateinit var dataStore: androidx.datastore.core.DataStore<Preferences>

    @Before
    fun setUp() {
        scope = TestScope(UnconfinedTestDispatcher() + Job())
        dataStore = PreferenceDataStoreFactory.create(
            scope = scope,
            produceFile = { temporaryFolder.newFile("controller.preferences_pb") }
        )
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun exposesCurrentTokenAndClearsStoreWhenInvalidated() = runTest {
        val store = SessionStore(dataStore)
        val session = MobileSession(
            token = "mobile-token",
            userId = "user-1",
            activeRole = MobileRole.MEMBER,
            allowedRoles = setOf(MobileRole.MEMBER),
            expiresAt = null
        )
        val controller = SessionController(store, scope)
        store.save(session)
        store.session.filterNotNull().first()

        assertEquals("mobile-token", controller.currentToken())

        controller.invalidateSession()

        assertNull(store.session.first())
        assertNull(controller.currentToken())
    }
}
