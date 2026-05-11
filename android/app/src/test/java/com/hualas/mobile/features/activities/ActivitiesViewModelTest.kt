package com.hualas.mobile.features.activities

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.data.ActivitiesAgenda
import com.hualas.mobile.features.activities.data.ActivityDay
import com.hualas.mobile.features.activities.data.ActivityDayDetail
import com.hualas.mobile.features.activities.data.ActivityDaySummary
import com.hualas.mobile.features.activities.data.ActivityParticipant
import com.hualas.mobile.features.activities.data.ActivityProfessor
import com.hualas.mobile.features.activities.data.ActivitySession
import com.hualas.mobile.features.activities.data.ActivitySummary
import com.hualas.mobile.features.activities.data.Attendance
import com.hualas.mobile.features.activities.data.AvailableActivities
import com.hualas.mobile.features.activities.data.AvailableActivity
import com.hualas.mobile.features.activities.data.AvailableActivityDay
import com.hualas.mobile.features.activities.data.AvailableActivityGroup
import com.hualas.mobile.features.activities.data.CartItemRequest
import com.hualas.mobile.features.activities.data.CartQuoteResponse
import com.hualas.mobile.features.activities.data.CheckoutResponse
import com.hualas.mobile.features.activities.data.ActivitiesRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ActivitiesViewModelTest {
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
    fun memberLoadFetchesAgendaSummaryAgendaAndAvailableActivities() = runTest {
        val repository = FakeActivitiesRepository()
        val viewModel = ActivitiesViewModel(repository)

        viewModel.load(MobileRole.MEMBER)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.agenda is UiState.Content<*>)
        assertTrue(viewModel.uiState.value.summary is UiState.Content<*>)
        assertTrue(viewModel.uiState.value.available is UiState.Content<*>)
        assertEquals(1, repository.availableCalls)
        assertTrue(repository.agendaCalls.contains(null to false))
        assertTrue(repository.agendaCalls.contains(null to true))
    }

    @Test
    fun professorLoadDoesNotFetchMemberAvailableActivities() = runTest {
        val repository = FakeActivitiesRepository()
        val viewModel = ActivitiesViewModel(repository)

        viewModel.load(MobileRole.PROFESSOR)
        advanceUntilIdle()

        assertEquals(0, repository.availableCalls)
        assertEquals(null, viewModel.uiState.value.available)
    }

    @Test
    fun selectDayReloadsAgendaWithDayFilter() = runTest {
        val repository = FakeActivitiesRepository()
        val viewModel = ActivitiesViewModel(repository)
        viewModel.load(MobileRole.MEMBER)
        advanceUntilIdle()

        viewModel.selectDay("2026-05-12")
        advanceUntilIdle()

        assertEquals("2026-05-12", viewModel.uiState.value.selectedDay)
        assertEquals("2026-05-12", repository.agendaCalls.last().first)
    }

    @Test
    fun loadDayDetailShowsCancelledDayAndGroupLabels() = runTest {
        val repository = FakeActivitiesRepository()
        val viewModel = ActivitiesViewModel(repository)

        viewModel.loadDayDetail("day-1")
        advanceUntilIdle()

        val detail = (viewModel.uiState.value.dayDetail as UiState.Content).value
        assertEquals(true, detail.day.cancelled)
        assertEquals("Grupo A", detail.day.groupName)
        assertEquals("Grupo A", detail.participants.first().groupName)
    }

    @Test
    fun activityCardsNoLongerStartCheckoutFromActivitiesViewModel() = runTest {
        val repository = FakeActivitiesRepository()
        val viewModel = ActivitiesViewModel(repository)

        viewModel.load(MobileRole.MEMBER)
        advanceUntilIdle()

        assertEquals(emptyList<CartItemRequest>(), repository.checkoutItems)
    }
}

private class FakeActivitiesRepository(
    private val agendaResult: ApiResult<ActivitiesAgenda> = ApiResult.Success(agenda()),
    private val summaryResult: ApiResult<ActivitiesAgenda> = ApiResult.Success(summary()),
    private val availableResult: ApiResult<AvailableActivities> = ApiResult.Success(
        AvailableActivities(MobileRole.MEMBER, listOf(availableActivity()))
    ),
    private val detailResult: ApiResult<ActivityDayDetail> = ApiResult.Success(dayDetail()),
    private val quoteResult: ApiResult<CartQuoteResponse> = ApiResult.Success(emptyQuote()),
    private val checkoutResult: ApiResult<CheckoutResponse> = ApiResult.Success(
        CheckoutResponse(redirectUrl = "https://mp.test/checkout")
    )
) : ActivitiesRepository {
    val agendaCalls = mutableListOf<Pair<String?, Boolean>>()
    var availableCalls = 0
    var checkoutItems = emptyList<CartItemRequest>()

    override suspend fun loadAgenda(day: String?): ApiResult<ActivitiesAgenda> {
        agendaCalls += day to false
        return agendaResult
    }

    override suspend fun loadAgendaSummary(): ApiResult<ActivitiesAgenda> {
        agendaCalls += null to true
        return summaryResult
    }

    override suspend fun loadDayDetail(dayId: String): ApiResult<ActivityDayDetail> {
        return detailResult
    }

    override suspend fun loadAvailableActivities(): ApiResult<AvailableActivities> {
        availableCalls += 1
        return availableResult
    }

    override suspend fun quoteCart(items: List<CartItemRequest>): ApiResult<CartQuoteResponse> {
        return quoteResult
    }

    override suspend fun startCheckout(items: List<CartItemRequest>): ApiResult<CheckoutResponse> {
        checkoutItems = items
        return checkoutResult
    }
}

private fun agenda() = ActivitiesAgenda(
    role = MobileRole.MEMBER,
    month = "2026-05",
    monthLabel = "Próximos 30 días",
    day = null,
    sessions = listOf(
        ActivitySession(
            id = "day-1",
            date = "2026-05-12",
            activityId = "activity-1",
            activityName = "Escalada",
            schedule = "10:00",
            geoLocation = "SMA",
            groupName = "Grupo A",
            activityGroupId = "group-1",
            cancelled = false,
            audienceLabel = "Para tu hijo/a"
        )
    ),
    days = emptyList()
)

private fun summary() = agenda().copy(
    sessions = emptyList(),
    days = listOf(ActivityDaySummary("2026-05-12", "2026-05-12", 1))
)

private fun dayDetail() = ActivityDayDetail(
    role = MobileRole.MEMBER,
    day = ActivityDay(
        id = "day-1",
        date = "2026-05-12",
        schedule = "10:00",
        geoLocation = "SMA",
        description = "Clase tecnica",
        planificacion = "Bloques",
        devolucion = null,
        cancelled = true,
        cancellationReason = "Tormenta",
        activity = ActivitySummary("activity-1", "Escalada", 12000.0),
        groupName = "Grupo A"
    ),
    professors = listOf(ActivityProfessor("prof-1", "Profe Hualas", "2944")),
    participants = listOf(
        ActivityParticipant(
            id = "participant-1",
            userId = null,
            childId = "child-1",
            label = "Nina Hualas",
            groupName = "Grupo A",
            attendance = Attendance("PENDING", null)
        )
    )
)

private fun availableActivity() = AvailableActivity(
    id = "activity-1",
    name = "Escalada",
    date = "2026-05-12",
    endDate = "2026-06-12",
    activityType = "COURSE",
    frequency = "Semanal",
    image = null,
    description = "Escalada inicial",
    price = 12000.0,
    participantCount = 4,
    groupCount = 1,
    hasAvailability = true,
    availabilityStatus = "OPEN",
    availabilityLabel = "Disponible",
    groups = listOf(
        AvailableActivityGroup("group-1", "Grupo A", null, 10, 8, 12, 5, 5)
    ),
    days = listOf(
        AvailableActivityDay("day-1", "2026-05-12", 2, "10:00", "SMA", "group-1", "Grupo A", false)
    )
)

private fun emptyQuote() = CartQuoteResponse(
    activityLines = emptyList(),
    discountLines = emptyList(),
    socialFeeLines = emptyList(),
    mercadoPagoFeeLines = emptyList(),
    totalActivityAmount = 12000.0,
    totalDiscountAmount = 0.0,
    totalSocialFeeAmount = 0.0,
    totalMercadoPagoFeeAmount = 0.0,
    totalAmount = 12000.0,
    totalAmountWithMercadoPagoFee = 12600.0,
    socialFeeAmount = 0.0
)
