package com.hualas.mobile.features.home.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import com.hualas.mobile.core.session.MobileRole
import java.io.IOException

class MobileHomeRepository(
    private val service: MobileHomeService
) : HomeRepository {
    override suspend fun loadHome(): ApiResult<HomeSummary> {
        val response = runCatching { service.home() }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> result.value.toHomeSummary()
            is ApiResult.ValidationError -> result
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Forbidden -> ApiResult.Forbidden
            ApiResult.NotFound -> ApiResult.NotFound
            is ApiResult.ServerError -> result
            is ApiResult.NetworkFailure -> result
        }
    }

    private fun MobileHomeResponse.toHomeSummary(): ApiResult<HomeSummary> {
        val role = when (kind.lowercase()) {
            "member" -> MobileRole.MEMBER
            "professor" -> MobileRole.PROFESSOR
            else -> return ApiResult.ServerError("Respuesta de inicio inválida")
        }

        return ApiResult.Success(
            HomeSummary(
                role = role,
                profile = HomeProfile(
                    id = profile.id,
                    name = profile.name,
                    email = profile.email,
                    birthDate = profile.birthDate
                ),
                stats = HomeStats(
                    childrenCount = stats.childrenCount,
                    activitiesCount = stats.activitiesCount,
                    groupsCount = stats.groupsCount,
                    upcomingDaysCount = stats.upcomingDaysCount,
                    pendingAttendanceCount = stats.pendingAttendanceCount,
                    unreadNotificationsCount = stats.unreadNotificationsCount
                ),
                children = children.map { child ->
                    HomeChild(
                        id = child.id,
                        name = child.name,
                        lastName = child.lastName,
                        birthDate = child.birthDate,
                        profilePhoto = child.profilePhoto
                    )
                },
                activities = activities.map { activity ->
                    HomeActivity(
                        id = activity.id,
                        name = activity.name,
                        date = activity.date,
                        endDate = activity.endDate,
                        frequency = activity.frequency,
                        price = activity.price,
                        participantName = activity.participantName,
                        groupName = activity.groupName,
                        groupsCount = activity.groupsCount
                    )
                },
                upcomingDays = upcomingDays.map { day ->
                    HomeUpcomingDay(
                        id = day.id,
                        activityId = day.activityId,
                        activityName = day.activityName,
                        groupName = day.groupName,
                        date = day.date,
                        schedule = day.schedule,
                        geoLocation = day.geoLocation,
                        cancelled = day.cancelled
                    )
                },
                recentNews = recentNews.map { news ->
                    HomeNewsItem(
                        id = news.id,
                        title = news.title,
                        body = news.body,
                        scope = news.scope,
                        activityName = news.activityName,
                        author = news.author,
                        createdAt = news.createdAt,
                        isRead = news.isRead
                    )
                }
            )
        )
    }

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return if (this is IOException) {
            toApiResult()
        } else {
            ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
        }
    }
}
