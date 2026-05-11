package com.hualas.mobile.features.home.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.Response

class MobileHomeRepositoryTest {
    @Test
    fun loadsMemberHomeWithFamilyActivitiesStatsAndNews() = runTest {
        val repository = MobileHomeRepository(
            service = FakeMobileHomeService(
                response = Response.success(memberHomeResponse())
            )
        )

        val result = repository.loadHome()

        val home = (result as ApiResult.Success).value
        assertEquals(MobileRole.MEMBER, home.role)
        assertEquals("Socia Hualas", home.profile.name)
        assertEquals(2, home.stats.childrenCount)
        assertEquals(3, home.stats.activitiesCount)
        assertEquals(5, home.stats.unreadNotificationsCount)
        assertEquals("Nina Hualas", home.children.first().fullName)
        assertEquals("Escalada", home.activities.first().name)
        assertEquals("Nina Hualas", home.activities.first().participantName)
        assertEquals("Grupo A", home.upcomingDays.first().groupName)
        assertEquals("Salida al Chapelco", home.recentNews.first().title)
    }

    @Test
    fun loadsProfessorHomeWithAssignedActivitiesPendingAttendanceAndNews() = runTest {
        val repository = MobileHomeRepository(
            service = FakeMobileHomeService(
                response = Response.success(professorHomeResponse())
            )
        )

        val result = repository.loadHome()

        val home = (result as ApiResult.Success).value
        assertEquals(MobileRole.PROFESSOR, home.role)
        assertEquals(4, home.stats.groupsCount)
        assertEquals(7, home.stats.pendingAttendanceCount)
        assertEquals("Montaña inicial", home.activities.first().name)
        assertEquals(4, home.activities.first().groupsCount)
        assertEquals("Lago Lácar", home.upcomingDays.first().geoLocation)
        assertEquals("Recordatorio", home.recentNews.first().title)
    }

    @Test
    fun unauthorizedHomeResponseReturnsUnauthorized() = runTest {
        val errorBody = """{"error":"Unauthorized"}"""
            .toResponseBody("application/json".toMediaType())
        val repository = MobileHomeRepository(
            service = FakeMobileHomeService(response = Response.error(401, errorBody))
        )

        assertEquals(ApiResult.Unauthorized, repository.loadHome())
    }
}

private class FakeMobileHomeService(
    private val response: Response<MobileHomeResponse>
) : MobileHomeService {
    override suspend fun home(): Response<MobileHomeResponse> = response
}

private fun memberHomeResponse() = MobileHomeResponse(
    kind = "member",
    profile = HomeProfileDto(
        id = "user-1",
        name = "Socia Hualas",
        email = "socia@hualas.test",
        birthDate = "1988-03-01"
    ),
    stats = HomeStatsDto(
        childrenCount = 2,
        activitiesCount = 3,
        upcomingDaysCount = 1,
        unreadNotificationsCount = 5
    ),
    children = listOf(
        HomeChildDto(
            id = "child-1",
            name = "Nina",
            lastName = "Hualas",
            birthDate = "2016-05-01",
            profilePhoto = null
        )
    ),
    activities = listOf(
        HomeActivityDto(
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
    upcomingDays = listOf(
        HomeUpcomingDayDto(
            id = "day-1",
            activityId = "activity-1",
            activityName = "Escalada",
            groupName = "Grupo A",
            date = "2026-05-12",
            schedule = "10:00",
            geoLocation = "SMA",
            cancelled = false
        )
    ),
    recentNews = listOf(
        HomeNewsDto(
            id = "news-1",
            title = "Salida al Chapelco",
            body = "Traer abrigo.",
            scope = "CLUB",
            activityId = null,
            activityName = null,
            author = "Coordinación",
            createdAt = "10/05/2026 09:00",
            isRead = false,
            readAt = null,
            media = emptyList()
        )
    )
)

private fun professorHomeResponse() = MobileHomeResponse(
    kind = "professor",
    profile = HomeProfileDto(
        id = "prof-1",
        name = "Profe Hualas",
        email = "profe@hualas.test",
        birthDate = null
    ),
    stats = HomeStatsDto(
        activitiesCount = 2,
        groupsCount = 4,
        upcomingDaysCount = 3,
        pendingAttendanceCount = 7,
        unreadNotificationsCount = 1
    ),
    activities = listOf(
        HomeActivityDto(
            id = "activity-2",
            name = "Montaña inicial",
            date = "2026-05-11",
            endDate = "2026-06-20",
            frequency = "Semanal",
            price = null,
            participantName = null,
            groupName = null,
            groupsCount = 4
        )
    ),
    upcomingDays = listOf(
        HomeUpcomingDayDto(
            id = "day-2",
            activityId = "activity-2",
            activityName = "Montaña inicial",
            groupName = null,
            date = "2026-05-11",
            schedule = "14:00",
            geoLocation = "Lago Lácar",
            cancelled = false
        )
    ),
    recentNews = listOf(
        HomeNewsDto(
            id = "news-2",
            title = "Recordatorio",
            body = "Cargar asistencia al terminar.",
            scope = "CLUB",
            activityId = null,
            activityName = null,
            author = "Admin",
            createdAt = "10/05/2026 10:00",
            isRead = true,
            readAt = "10/05/2026 10:05",
            media = emptyList()
        )
    )
)
