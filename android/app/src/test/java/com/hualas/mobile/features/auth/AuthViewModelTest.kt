package com.hualas.mobile.features.auth

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.MobileSession
import com.hualas.mobile.features.auth.data.AuthRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.resetMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun invalidLoginShowsInlineSpanishError() = runTest {
        val viewModel = AuthViewModel(
            repository = FakeAuthRepository(loginResult = ApiResult.Unauthorized)
        )

        viewModel.updateEmail("bad@hualas.test")
        viewModel.updatePassword("wrong")
        viewModel.login()
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isLoading)
        assertEquals("Credenciales inválidas", viewModel.uiState.value.errorMessage)
    }

    @Test
    fun validLoginClearsFormError() = runTest {
        val viewModel = AuthViewModel(
            repository = FakeAuthRepository(loginResult = ApiResult.Success(session()))
        )

        viewModel.updateEmail("socio@hualas.test")
        viewModel.updatePassword("secret")
        viewModel.login()
        advanceUntilIdle()

        assertEquals(null, viewModel.uiState.value.errorMessage)
    }

    @Test
    fun bothRolesCanSwitchActiveRole() = runTest {
        val repository = FakeAuthRepository(
            switchResult = ApiResult.Success(session(activeRole = MobileRole.PROFESSOR))
        )
        val viewModel = AuthViewModel(repository = repository)

        viewModel.switchRole(MobileRole.PROFESSOR)
        advanceUntilIdle()

        assertEquals(MobileRole.PROFESSOR, repository.requestedRole)
        assertEquals(null, viewModel.uiState.value.errorMessage)
    }

    @Test
    fun blankFieldsAreValidatedBeforeCallingBackend() = runTest {
        val repository = FakeAuthRepository()
        val viewModel = AuthViewModel(repository = repository)

        viewModel.login()
        advanceUntilIdle()

        assertEquals("Ingresá tu email y contraseña", viewModel.uiState.value.errorMessage)
        assertEquals(0, repository.loginCalls)
    }

    private fun session(activeRole: MobileRole = MobileRole.MEMBER) = MobileSession(
        token = "token",
        userId = "user-1",
        activeRole = activeRole,
        allowedRoles = setOf(MobileRole.MEMBER, MobileRole.PROFESSOR),
        expiresAt = "2026-06-10T20:00:00.000Z"
    )
}

private class FakeAuthRepository(
    private val loginResult: ApiResult<MobileSession> = ApiResult.Success(
        MobileSession("token", "user-1", MobileRole.MEMBER, setOf(MobileRole.MEMBER), null)
    ),
    private val switchResult: ApiResult<MobileSession> = loginResult
) : AuthRepository {
    var loginCalls = 0
    var requestedRole: MobileRole? = null

    override suspend fun login(email: String, password: String): ApiResult<MobileSession> {
        loginCalls += 1
        return loginResult
    }

    override suspend fun restore(): ApiResult<MobileSession> = loginResult

    override suspend fun logout() {}

    override suspend fun switchRole(role: MobileRole): ApiResult<MobileSession> {
        requestedRole = role
        return switchResult
    }
}
