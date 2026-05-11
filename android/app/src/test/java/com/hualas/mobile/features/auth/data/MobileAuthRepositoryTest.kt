package com.hualas.mobile.features.auth.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.SessionStore
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class MobileAuthRepositoryTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var scope: TestScope
    private lateinit var dataStore: androidx.datastore.core.DataStore<Preferences>

    @Before
    fun setUp() {
        scope = TestScope(UnconfinedTestDispatcher() + Job())
        dataStore = PreferenceDataStoreFactory.create(
            scope = scope,
            produceFile = { temporaryFolder.newFile("auth.preferences_pb") }
        )
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun loginStoresReturnedMobileSession() = runTest {
        val service = FakeMobileAuthService(
            loginResponse = Response.success(authResponse(appRole = "PROFESSOR"))
        )
        val store = SessionStore(dataStore)
        val repository = MobileAuthRepository(service, store) { null }

        val result = repository.login(email = "socio@hualas.test", password = "secret")

        assertEquals(MobileRole.PROFESSOR, (result as ApiResult.Success).value.activeRole)
        assertEquals("mobile-token", store.session.first()?.token)
        assertEquals(MobileRole.PROFESSOR, store.session.first()?.activeRole)
        assertEquals(setOf(MobileRole.MEMBER, MobileRole.PROFESSOR), store.session.first()?.allowedRoles)
        assertEquals("Android", service.lastLoginRequest?.platform)
    }

    @Test
    fun restoreUsesCurrentTokenAndStoresMeSession() = runTest {
        val service = FakeMobileAuthService(
            meResponse = Response.success(meResponse(appRole = "MEMBER"))
        )
        val store = SessionStore(dataStore)
        val repository = MobileAuthRepository(service, store) { "existing-token" }

        val result = repository.restore()

        assertEquals(MobileRole.MEMBER, (result as ApiResult.Success).value.activeRole)
        assertEquals("existing-token", store.session.first()?.token)
    }

    @Test
    fun restoreFallsBackToStoredTokenWhenControllerCacheIsNotReady() = runTest {
        val service = FakeMobileAuthService(
            meResponse = Response.success(meResponse(appRole = "PROFESSOR"))
        )
        val store = SessionStore(dataStore)
        store.save(session(activeRole = MobileRole.MEMBER))
        val repository = MobileAuthRepository(service, store) { null }

        val result = repository.restore()

        assertEquals(MobileRole.PROFESSOR, (result as ApiResult.Success).value.activeRole)
        assertEquals("existing-token", store.session.first()?.token)
    }

    @Test
    fun logoutCallsBackendAndClearsLocalSession() = runTest {
        val service = FakeMobileAuthService(
            logoutResponse = Response.success(LogoutResponse(ok = true))
        )
        val store = SessionStore(dataStore)
        val repository = MobileAuthRepository(service, store) { "existing-token" }
        store.save(session())

        repository.logout()

        assertEquals(1, service.logoutCalls)
        assertNull(store.session.first())
    }

    @Test
    fun switchRoleStoresNewActiveRoleWithoutChangingToken() = runTest {
        val service = FakeMobileAuthService(
            switchRoleResponse = Response.success(
                SwitchRoleResponse(
                    ok = true,
                    appRole = "PROFESSOR",
                    allowedRoles = listOf("MEMBER", "PROFESSOR")
                )
            )
        )
        val store = SessionStore(dataStore)
        store.save(session(activeRole = MobileRole.MEMBER))
        val repository = MobileAuthRepository(service, store) { "existing-token" }

        val result = repository.switchRole(MobileRole.PROFESSOR)

        assertEquals(MobileRole.PROFESSOR, (result as ApiResult.Success).value.activeRole)
        assertEquals("existing-token", store.session.first()?.token)
        assertEquals(MobileRole.PROFESSOR, store.session.first()?.activeRole)
    }

    @Test
    fun invalidLoginReturnsValidationMessageAndDoesNotStoreSession() = runTest {
        val errorBody = """{"error":"Credenciales inválidas"}"""
            .toResponseBody("application/json".toMediaType())
        val service = FakeMobileAuthService(loginResponse = Response.error(401, errorBody))
        val store = SessionStore(dataStore)
        val repository = MobileAuthRepository(service, store) { null }

        val result = repository.login(email = "bad@hualas.test", password = "wrong")

        assertEquals(ApiResult.Unauthorized, result)
        assertNull(store.session.first())
    }

    private fun session(activeRole: MobileRole = MobileRole.MEMBER) = com.hualas.mobile.core.session.MobileSession(
        token = "existing-token",
        userId = "user-1",
        activeRole = activeRole,
        allowedRoles = setOf(MobileRole.MEMBER, MobileRole.PROFESSOR),
        expiresAt = "2026-06-10T20:00:00.000Z"
    )

    private fun authResponse(appRole: String) = LoginResponse(
        token = "mobile-token",
        session = AuthSessionDto(
            id = "session-1",
            appRole = appRole,
            expiresAt = "2026-06-10T20:00:00.000Z",
            lastUsedAt = null
        ),
        user = MobileUserDto(
            id = "user-1",
            email = "socio@hualas.test",
            name = "Socia",
            lastName = "Hualas",
            role = "MEMBER",
            activeRole = "MEMBER",
            mobileRole = appRole,
            allowedRoles = listOf("MEMBER", "PROFESSOR"),
            profilePhoto = null,
            isActive = true
        )
    )

    private fun meResponse(appRole: String) = MeResponse(
        session = AuthSessionDto(
            id = "session-1",
            appRole = appRole,
            expiresAt = "2026-06-10T20:00:00.000Z",
            lastUsedAt = "2026-05-10T20:00:00.000Z"
        ),
        user = MobileUserDto(
            id = "user-1",
            email = "socio@hualas.test",
            name = "Socia",
            lastName = "Hualas",
            role = "MEMBER",
            activeRole = "MEMBER",
            mobileRole = appRole,
            allowedRoles = listOf("MEMBER", "PROFESSOR"),
            profilePhoto = null,
            isActive = true
        )
    )
}

private class FakeMobileAuthService(
    private val loginResponse: Response<LoginResponse> = Response.success(
        LoginResponse("token", AuthSessionDto("session", "MEMBER", null, null), userDto())
    ),
    private val meResponse: Response<MeResponse> = Response.success(
        MeResponse(userDto(), AuthSessionDto("session", "MEMBER", null, null))
    ),
    private val logoutResponse: Response<LogoutResponse> = Response.success(LogoutResponse(ok = true)),
    private val switchRoleResponse: Response<SwitchRoleResponse> = Response.success(
        SwitchRoleResponse(ok = true, appRole = "MEMBER", allowedRoles = listOf("MEMBER"))
    )
) : MobileAuthService {
    var lastLoginRequest: LoginRequest? = null
    var logoutCalls = 0

    override suspend fun login(request: LoginRequest): Response<LoginResponse> {
        lastLoginRequest = request
        return loginResponse
    }

    override suspend fun me(): Response<MeResponse> = meResponse

    override suspend fun logout(): Response<LogoutResponse> {
        logoutCalls += 1
        return logoutResponse
    }

    override suspend fun switchRole(request: SwitchRoleRequest): Response<SwitchRoleResponse> {
        return switchRoleResponse
    }
}

private fun userDto() = MobileUserDto(
    id = "user",
    email = "user@hualas.test",
    name = "User",
    lastName = "Hualas",
    role = "MEMBER",
    activeRole = "MEMBER",
    mobileRole = "MEMBER",
    allowedRoles = listOf("MEMBER"),
    profilePhoto = null,
    isActive = true
)
