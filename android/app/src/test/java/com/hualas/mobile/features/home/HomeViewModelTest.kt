package com.hualas.mobile.features.home

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.home.data.HomeActivity
import com.hualas.mobile.features.home.data.HomeNewsItem
import com.hualas.mobile.features.home.data.HomeProfile
import com.hualas.mobile.features.home.data.HomeRepository
import com.hualas.mobile.features.home.data.HomeStats
import com.hualas.mobile.features.home.data.HomeSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
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
    fun loadHomeExposesContentFromRepository() = runTest {
        val viewModel = HomeViewModel(
            repository = FakeHomeRepository(ApiResult.Success(memberHome()))
        )

        viewModel.load()
        advanceUntilIdle()

        val state = viewModel.uiState.value as UiState.Content
        assertEquals(MobileRole.MEMBER, state.value.role)
        assertEquals("Socia Hualas", state.value.profile.name)
        assertEquals(3, state.value.stats.activitiesCount)
    }

    @Test
    fun refreshKeepsExistingContentWhileLoadingNewHomeData() = runTest {
        val repository = FakeHomeRepository(ApiResult.Success(memberHome()))
        val viewModel = HomeViewModel(repository)
        viewModel.load()
        advanceUntilIdle()

        repository.result = ApiResult.Success(memberHome(unreadNotificationsCount = 8))
        viewModel.refresh()

        assertTrue((viewModel.uiState.value as UiState.Content).isRefreshing)
        advanceUntilIdle()

        val state = viewModel.uiState.value as UiState.Content
        assertFalse(state.isRefreshing)
        assertEquals(8, state.value.stats.unreadNotificationsCount)
    }

    @Test
    fun networkFailureShowsRetryableSpanishError() = runTest {
        val viewModel = HomeViewModel(
            repository = FakeHomeRepository(ApiResult.NetworkFailure("timeout"))
        )

        viewModel.load()
        advanceUntilIdle()

        assertEquals(
            UiState.Error(
                message = "No se pudo cargar el inicio. Revisá tu conexión.",
                retryable = true
            ),
            viewModel.uiState.value
        )
    }
}

private class FakeHomeRepository(
    var result: ApiResult<HomeSummary>
) : HomeRepository {
    override suspend fun loadHome(): ApiResult<HomeSummary> = result
}

private fun memberHome(unreadNotificationsCount: Int = 5) = HomeSummary(
    role = MobileRole.MEMBER,
    profile = HomeProfile(
        id = "user-1",
        name = "Socia Hualas",
        email = "socia@hualas.test",
        birthDate = "1988-03-01"
    ),
    stats = HomeStats(
        childrenCount = 2,
        activitiesCount = 3,
        upcomingDaysCount = 1,
        unreadNotificationsCount = unreadNotificationsCount
    ),
    children = emptyList(),
    activities = listOf(
        HomeActivity(
            id = "activity-1",
            name = "Escalada",
            date = "2026-05-12",
            endDate = "2026-06-12",
            frequency = "Semanal",
            price = 12000.0,
            participantName = "Nina Hualas",
            groupName = "Grupo A",
            groupsCount = null
        )
    ),
    upcomingDays = emptyList(),
    recentNews = listOf(
        HomeNewsItem(
            id = "news-1",
            title = "Salida al Chapelco",
            body = "Traer abrigo.",
            scope = "CLUB",
            activityName = null,
            author = "Coordinación",
            createdAt = "10/05/2026 09:00",
            isRead = false
        )
    )
)
