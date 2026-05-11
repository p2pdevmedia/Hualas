package com.hualas.mobile.features.activities.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.Response

class MobileActivitiesRepositoryTest {
    @Test
    fun loadsAgendaSessionsForCurrentRole() = runTest {
        val service = FakeMobileActivitiesService(
            agendaResponse = Response.success(agendaResponse(role = "MEMBER"))
        )
        val repository = MobileActivitiesRepository(service)

        val result = repository.loadAgenda(day = "2026-05-12")

        val agenda = (result as ApiResult.Success).value
        assertEquals(MobileRole.MEMBER, agenda.role)
        assertEquals("2026-05-12", service.lastAgendaDay)
        assertEquals(false, service.lastAgendaSummary)
        assertEquals("Escalada", agenda.sessions.first().activityName)
        assertEquals("Para tu hijo/a", agenda.sessions.first().audienceLabel)
    }

    @Test
    fun loadsAgendaSummaryDays() = runTest {
        val service = FakeMobileActivitiesService(
            agendaResponse = Response.success(
                MobileActivitiesResponse(
                    role = "PROFESSOR",
                    month = "2026-05",
                    monthLabel = "Próximos 30 días",
                    days = listOf(ActivityDaySummaryDto("2026-05-12", "2026-05-12", 3))
                )
            )
        )
        val repository = MobileActivitiesRepository(service)

        val result = repository.loadAgendaSummary()

        val agenda = (result as ApiResult.Success).value
        assertEquals(MobileRole.PROFESSOR, agenda.role)
        assertEquals(true, service.lastAgendaSummary)
        assertEquals(3, agenda.days.first().sessionCount)
    }

    @Test
    fun loadsActivityDayDetailWithCancelledLabelsAndParticipants() = runTest {
        val repository = MobileActivitiesRepository(
            FakeMobileActivitiesService(dayDetailResponse = Response.success(dayDetailResponse()))
        )

        val result = repository.loadDayDetail("day-1")

        val detail = (result as ApiResult.Success).value
        assertEquals(MobileRole.PROFESSOR, detail.role)
        assertEquals(true, detail.day.cancelled)
        assertEquals("Tormenta", detail.day.cancellationReason)
        assertEquals("Nina Hualas", detail.participants.first().label)
        assertEquals("PENDING", detail.participants.first().attendance.status)
    }

    @Test
    fun loadsAvailableActivitiesForMembers() = runTest {
        val repository = MobileActivitiesRepository(
            FakeMobileActivitiesService(
                availableResponse = Response.success(availableResponse())
            )
        )

        val result = repository.loadAvailableActivities()

        val available = (result as ApiResult.Success).value
        assertEquals(MobileRole.MEMBER, available.role)
        assertEquals("Disponible", available.activities.first().availabilityLabel)
        assertEquals(5, available.activities.first().groups.first().remainingCapacity)
    }

    @Test
    fun quotesAndStartsCheckoutForSelectedActivities() = runTest {
        val service = FakeMobileActivitiesService(
            quoteResponse = Response.success(quoteResponse()),
            checkoutResponse = Response.success(CheckoutResponse(redirectUrl = "https://mp.test/checkout"))
        )
        val repository = MobileActivitiesRepository(service)
        val item = CartItemRequest(activityId = "activity-1", target = "child-1", targetLabel = "Nina")

        val quote = repository.quoteCart(listOf(item))
        val checkout = repository.startCheckout(listOf(item))

        assertEquals(12000.0, (quote as ApiResult.Success).value.totalAmount, 0.0)
        assertEquals("https://mp.test/checkout", (checkout as ApiResult.Success).value.redirectUrl)
        assertEquals(listOf(item), service.lastQuoteRequest?.items)
        assertEquals(listOf(item), service.lastCheckoutRequest?.items)
    }

    @Test
    fun forbiddenAvailableActivitiesResponseIsMapped() = runTest {
        val errorBody = """{"error":"Solo los socios pueden ver actividades disponibles."}"""
            .toResponseBody("application/json".toMediaType())
        val repository = MobileActivitiesRepository(
            FakeMobileActivitiesService(availableResponse = Response.error(403, errorBody))
        )

        assertEquals(ApiResult.Forbidden, repository.loadAvailableActivities())
    }

    @Test
    fun invalidAgendaRoleReturnsServerError() = runTest {
        val repository = MobileActivitiesRepository(
            FakeMobileActivitiesService(
                agendaResponse = Response.success(agendaResponse(role = "ADMIN"))
            )
        )

        assertEquals(
            ApiResult.ServerError("Respuesta de actividades inválida"),
            repository.loadAgenda()
        )
    }
}

private class FakeMobileActivitiesService(
    private val agendaResponse: Response<MobileActivitiesResponse> = Response.success(agendaResponse()),
    private val dayDetailResponse: Response<ActivityDayDetailResponse> = Response.success(dayDetailResponse()),
    private val availableResponse: Response<AvailableActivitiesResponse> = Response.success(availableResponse()),
    private val quoteResponse: Response<CartQuoteResponse> = Response.success(quoteResponse()),
    private val checkoutResponse: Response<CheckoutResponse> = Response.success(
        CheckoutResponse(redirectUrl = "https://mp.test/checkout")
    )
) : MobileActivitiesService {
    var lastAgendaDay: String? = null
    var lastAgendaSummary: Boolean? = null
    var lastQuoteRequest: CartRequest? = null
    var lastCheckoutRequest: CartRequest? = null

    override suspend fun agenda(day: String?, summary: Boolean?): Response<MobileActivitiesResponse> {
        lastAgendaDay = day
        lastAgendaSummary = summary
        return agendaResponse
    }

    override suspend fun dayDetail(dayId: String): Response<ActivityDayDetailResponse> {
        return dayDetailResponse
    }

    override suspend fun availableActivities(): Response<AvailableActivitiesResponse> {
        return availableResponse
    }

    override suspend fun quote(request: CartRequest): Response<CartQuoteResponse> {
        lastQuoteRequest = request
        return quoteResponse
    }

    override suspend fun checkout(request: CartRequest): Response<CheckoutResponse> {
        lastCheckoutRequest = request
        return checkoutResponse
    }
}

private fun agendaResponse(role: String = "MEMBER") = MobileActivitiesResponse(
    role = role,
    month = "2026-05",
    monthLabel = "Próximos 30 días",
    day = "2026-05-12",
    sessions = listOf(
        ActivitySessionDto(
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
    )
)

private fun dayDetailResponse() = ActivityDayDetailResponse(
    role = "PROFESSOR",
    day = ActivityDayDto(
        id = "day-1",
        date = "2026-05-12",
        schedule = "10:00",
        geoLocation = "SMA",
        description = "Clase tecnica",
        planificacion = "Bloques",
        devolucion = null,
        cancelled = true,
        cancellationReason = "Tormenta",
        activity = ActivitySummaryDto(id = "activity-1", name = "Escalada", price = 12000.0),
        groupName = "Grupo A"
    ),
    professors = listOf(ActivityProfessorDto(id = "prof-1", label = "Profe Hualas", phone = "2944")),
    participants = listOf(
        ActivityParticipantDto(
            id = "participant-1",
            userId = null,
            childId = "child-1",
            label = "Nina Hualas",
            groupName = "Grupo A",
            attendance = AttendanceDto(status = "PENDING", confirmedAt = null)
        )
    )
)

private fun availableResponse() = AvailableActivitiesResponse(
    role = "MEMBER",
    activities = listOf(
        AvailableActivityDto(
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
                AvailableActivityGroupDto(
                    id = "group-1",
                    name = "Grupo A",
                    description = null,
                    capacity = 10,
                    minAge = 8,
                    maxAge = 12,
                    memberCount = 5,
                    remainingCapacity = 5
                )
            ),
            days = listOf(
                AvailableActivityDayDto(
                    id = "day-1",
                    date = "2026-05-12",
                    weekday = 2,
                    schedule = "10:00",
                    geoLocation = "SMA",
                    activityGroupId = "group-1",
                    groupName = "Grupo A",
                    cancelled = false
                )
            )
        )
    )
)

private fun quoteResponse() = CartQuoteResponse(
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
