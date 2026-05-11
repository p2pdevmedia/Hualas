package com.hualas.mobile.features.activities.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.Response

class MobileActivitiesRepository(
    private val service: MobileActivitiesService
) : ActivitiesRepository {
    override suspend fun loadAgenda(day: String?): ApiResult<ActivitiesAgenda> {
        val response = runCatching {
            service.agenda(day = day, summary = false)
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toActivitiesApiResult()) {
            is ApiResult.Success -> result.value.toAgenda()
            else -> result.toActivitiesError()
        }
    }

    override suspend fun loadAgendaSummary(): ApiResult<ActivitiesAgenda> {
        val response = runCatching {
            service.agenda(summary = true)
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toActivitiesApiResult()) {
            is ApiResult.Success -> result.value.toAgenda()
            else -> result.toActivitiesError()
        }
    }

    override suspend fun loadDayDetail(dayId: String): ApiResult<ActivityDayDetail> {
        val response = runCatching {
            service.dayDetail(dayId)
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toActivitiesApiResult()) {
            is ApiResult.Success -> result.value.toDayDetail()
            else -> result.toActivitiesError()
        }
    }

    override suspend fun loadAvailableActivities(): ApiResult<AvailableActivities> {
        val response = runCatching {
            service.availableActivities()
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return when (val result = response.toActivitiesApiResult()) {
            is ApiResult.Success -> result.value.toAvailableActivities()
            else -> result.toActivitiesError()
        }
    }

    override suspend fun quoteCart(items: List<CartItemRequest>): ApiResult<CartQuoteResponse> {
        val response = runCatching {
            service.quote(CartRequest(items))
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return response.toActivitiesApiResult()
    }

    override suspend fun startCheckout(items: List<CartItemRequest>): ApiResult<CheckoutResponse> {
        val response = runCatching {
            service.checkout(CartRequest(items))
        }.getOrElse { throwable ->
            return throwable.toNetworkFailure()
        }

        return response.toActivitiesApiResult()
    }

    private fun MobileActivitiesResponse.toAgenda(): ApiResult<ActivitiesAgenda> {
        val parsedRole = role.toMobileRoleOrNull()
            ?: return ApiResult.ServerError("Respuesta de actividades inválida")

        return ApiResult.Success(
            ActivitiesAgenda(
                role = parsedRole,
                month = month,
                monthLabel = monthLabel,
                day = day,
                sessions = sessions.map { it.toSession() },
                days = days.map { it.toSummary() }
            )
        )
    }

    private fun ActivityDayDetailResponse.toDayDetail(): ApiResult<ActivityDayDetail> {
        val parsedRole = role.toMobileRoleOrNull()
            ?: return ApiResult.ServerError("Respuesta de actividades inválida")

        return ApiResult.Success(
            ActivityDayDetail(
                role = parsedRole,
                day = day.toDay(),
                professors = professors.map { it.toProfessor() },
                participants = participants.map { it.toParticipant() }
            )
        )
    }

    private fun AvailableActivitiesResponse.toAvailableActivities(): ApiResult<AvailableActivities> {
        val parsedRole = role.toMobileRoleOrNull()
            ?: return ApiResult.ServerError("Respuesta de actividades inválida")

        return ApiResult.Success(
            AvailableActivities(
                role = parsedRole,
                activities = activities.map { it.toAvailableActivity() }
            )
        )
    }

    private fun ActivitySessionDto.toSession() = ActivitySession(
        id = id,
        date = date,
        activityId = activityId,
        activityName = activityName,
        schedule = schedule,
        geoLocation = geoLocation,
        groupName = groupName,
        activityGroupId = activityGroupId,
        cancelled = cancelled,
        audienceLabel = audienceLabel
    )

    private fun ActivityDaySummaryDto.toSummary() = ActivityDaySummary(
        id = id,
        date = date,
        sessionCount = sessionCount
    )

    private fun ActivityDayDto.toDay() = ActivityDay(
        id = id,
        date = date,
        schedule = schedule,
        geoLocation = geoLocation,
        description = description,
        planificacion = planificacion,
        devolucion = devolucion,
        cancelled = cancelled,
        cancellationReason = cancellationReason,
        activity = ActivitySummary(activity.id, activity.name, activity.price),
        groupName = groupName
    )

    private fun ActivityProfessorDto.toProfessor() = ActivityProfessor(
        id = id,
        label = label,
        phone = phone
    )

    private fun ActivityParticipantDto.toParticipant() = ActivityParticipant(
        id = id,
        userId = userId,
        childId = childId,
        label = label,
        groupName = groupName,
        attendance = Attendance(attendance.status, attendance.confirmedAt)
    )

    private fun AvailableActivityDto.toAvailableActivity() = AvailableActivity(
        id = id,
        name = name,
        date = date,
        endDate = endDate,
        activityType = activityType,
        frequency = frequency,
        image = image,
        description = description,
        price = price,
        participantCount = participantCount,
        groupCount = groupCount,
        hasAvailability = hasAvailability,
        availabilityStatus = availabilityStatus,
        availabilityLabel = availabilityLabel,
        groups = groups.map { it.toAvailableGroup() },
        days = days.map { it.toAvailableDay() }
    )

    private fun AvailableActivityGroupDto.toAvailableGroup() = AvailableActivityGroup(
        id = id,
        name = name,
        description = description,
        capacity = capacity,
        minAge = minAge,
        maxAge = maxAge,
        memberCount = memberCount,
        remainingCapacity = remainingCapacity
    )

    private fun AvailableActivityDayDto.toAvailableDay() = AvailableActivityDay(
        id = id,
        date = date,
        weekday = weekday,
        schedule = schedule,
        geoLocation = geoLocation,
        activityGroupId = activityGroupId,
        groupName = groupName,
        cancelled = cancelled
    )

    private fun String.toMobileRoleOrNull(): MobileRole? {
        return when (uppercase()) {
            "MEMBER" -> MobileRole.MEMBER
            "PROFESSOR" -> MobileRole.PROFESSOR
            else -> null
        }
    }

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> ApiResult<*>.toActivitiesError(): ApiResult<T> {
        return when (this) {
            is ApiResult.Success -> error("Success must be handled before mapping errors")
            is ApiResult.ValidationError -> this
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Forbidden -> ApiResult.Forbidden
            ApiResult.NotFound -> ApiResult.NotFound
            is ApiResult.ServerError -> this
            is ApiResult.NetworkFailure -> this
        }
    }

    private fun <T> Response<T>.toActivitiesApiResult(): ApiResult<T> {
        if (isSuccessful) {
            val responseBody = body()
            return if (responseBody != null) {
                ApiResult.Success(responseBody)
            } else {
                ApiResult.ServerError("La respuesta del servidor vino vacía")
            }
        }

        return when (code()) {
            400, 422 -> ApiResult.ValidationError(errorMessage())
            401 -> ApiResult.Unauthorized
            403 -> ApiResult.Forbidden
            404 -> ApiResult.NotFound
            else -> ApiResult.ServerError(errorMessage())
        }
    }

    private fun <T> Response<T>.errorMessage(): String {
        val rawBody = errorBody()?.string().orEmpty()
        if (rawBody.isBlank()) {
            return "No se pudo completar la solicitud"
        }

        return runCatching {
            val payload = errorJson.parseToJsonElement(rawBody).jsonObject
            payload["error"]?.jsonPrimitive?.content
                ?: payload["message"]?.jsonPrimitive?.content
                ?: "No se pudo completar la solicitud"
        }.getOrDefault("No se pudo completar la solicitud")
    }

    private companion object {
        val errorJson = Json { ignoreUnknownKeys = true }
    }
}
