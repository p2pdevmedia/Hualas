package com.hualas.mobile.core.session

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
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
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class SessionStoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var scope: TestScope
    private lateinit var dataStore: androidx.datastore.core.DataStore<Preferences>

    @Before
    fun setUp() {
        scope = TestScope(UnconfinedTestDispatcher() + Job())
        dataStore = PreferenceDataStoreFactory.create(
            scope = scope,
            produceFile = { temporaryFolder.newFile("session.preferences_pb") }
        )
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun persistsAndClearsMobileSession() = runTest {
        val store = SessionStore(
            dataStore = dataStore,
            now = { Instant.parse("2026-05-10T19:00:00.000Z") }
        )
        val session = MobileSession(
            token = "mobile-token",
            userId = "user-1",
            activeRole = MobileRole.MEMBER,
            allowedRoles = setOf(MobileRole.MEMBER, MobileRole.PROFESSOR),
            expiresAt = "2026-05-10T20:00:00.000Z"
        )

        store.save(session)

        assertEquals(session, store.session.first())

        store.clear()

        assertNull(store.session.first())
    }

    @Test
    fun returnsNullWhenStoredSessionIsExpired() = runTest {
        val store = SessionStore(
            dataStore = dataStore,
            now = { Instant.parse("2026-05-10T20:00:00.000Z") }
        )

        store.save(
            MobileSession(
                token = "mobile-token",
                userId = "user-1",
                activeRole = MobileRole.MEMBER,
                allowedRoles = setOf(MobileRole.MEMBER),
                expiresAt = "2026-05-10T19:59:59.000Z"
            )
        )

        assertNull(store.session.first())
    }
}
