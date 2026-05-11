package com.hualas.mobile.features.activities.data

import com.hualas.mobile.core.session.MobileRole

data class ActivitiesAgenda(
    val role: MobileRole,
    val month: String,
    val monthLabel: String,
    val day: String?,
    val sessions: List<ActivitySession>,
    val days: List<ActivityDaySummary>
)

data class ActivitySession(
    val id: String,
    val date: String,
    val activityId: String,
    val activityName: String,
    val schedule: String,
    val geoLocation: String?,
    val groupName: String?,
    val activityGroupId: String?,
    val cancelled: Boolean,
    val audienceLabel: String?
)

data class ActivityDaySummary(
    val id: String,
    val date: String,
    val sessionCount: Int
)

data class ActivityDayDetail(
    val role: MobileRole,
    val day: ActivityDay,
    val professors: List<ActivityProfessor>,
    val participants: List<ActivityParticipant>
)

data class ActivityDay(
    val id: String,
    val date: String,
    val schedule: String,
    val geoLocation: String?,
    val description: String?,
    val planificacion: String?,
    val devolucion: String?,
    val cancelled: Boolean,
    val cancellationReason: String?,
    val activity: ActivitySummary,
    val groupName: String?
)

data class ActivitySummary(
    val id: String,
    val name: String,
    val price: Double?
)

data class ActivityProfessor(
    val id: String,
    val label: String,
    val phone: String?
)

data class ActivityParticipant(
    val id: String,
    val userId: String?,
    val childId: String?,
    val label: String,
    val groupName: String?,
    val attendance: Attendance
)

data class Attendance(
    val status: String,
    val confirmedAt: String?
)

data class AvailableActivities(
    val role: MobileRole,
    val activities: List<AvailableActivity>
)

data class AvailableActivity(
    val id: String,
    val name: String,
    val date: String,
    val endDate: String,
    val activityType: String,
    val frequency: String,
    val image: String?,
    val description: String?,
    val price: Double,
    val participantCount: Int,
    val groupCount: Int,
    val hasAvailability: Boolean,
    val availabilityStatus: String,
    val availabilityLabel: String,
    val groups: List<AvailableActivityGroup>,
    val days: List<AvailableActivityDay>
)

data class AvailableActivityGroup(
    val id: String,
    val name: String,
    val description: String?,
    val capacity: Int?,
    val minAge: Int?,
    val maxAge: Int?,
    val memberCount: Int,
    val remainingCapacity: Int?
)

data class AvailableActivityDay(
    val id: String,
    val date: String,
    val weekday: Int,
    val schedule: String,
    val geoLocation: String,
    val activityGroupId: String?,
    val groupName: String?,
    val cancelled: Boolean
)
