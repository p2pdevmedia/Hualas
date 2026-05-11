package com.hualas.mobile.features.home.data

import kotlinx.serialization.Serializable

@Serializable
data class MobileHomeResponse(
    val kind: String,
    val profile: HomeProfileDto,
    val stats: HomeStatsDto,
    val children: List<HomeChildDto> = emptyList(),
    val activities: List<HomeActivityDto> = emptyList(),
    val upcomingDays: List<HomeUpcomingDayDto> = emptyList(),
    val recentNews: List<HomeNewsDto> = emptyList()
)

@Serializable
data class HomeProfileDto(
    val id: String,
    val name: String,
    val email: String,
    val birthDate: String? = null
)

@Serializable
data class HomeStatsDto(
    val childrenCount: Int = 0,
    val activitiesCount: Int = 0,
    val groupsCount: Int = 0,
    val upcomingDaysCount: Int = 0,
    val pendingAttendanceCount: Int = 0,
    val unreadNotificationsCount: Int = 0
)

@Serializable
data class HomeChildDto(
    val id: String,
    val name: String,
    val lastName: String? = null,
    val birthDate: String? = null,
    val profilePhoto: String? = null
)

@Serializable
data class HomeActivityDto(
    val id: String,
    val name: String,
    val date: String? = null,
    val endDate: String? = null,
    val frequency: String? = null,
    val price: Double? = null,
    val participantName: String? = null,
    val groupName: String? = null,
    val groupsCount: Int? = null
)

@Serializable
data class HomeUpcomingDayDto(
    val id: String,
    val activityId: String,
    val activityName: String,
    val groupName: String? = null,
    val date: String,
    val schedule: String? = null,
    val geoLocation: String? = null,
    val cancelled: Boolean = false
)

@Serializable
data class HomeNewsDto(
    val id: String,
    val title: String,
    val body: String,
    val scope: String,
    val activityId: String? = null,
    val activityName: String? = null,
    val author: String,
    val createdAt: String,
    val isRead: Boolean,
    val readAt: String? = null,
    val media: List<HomeNewsMediaDto> = emptyList()
)

@Serializable
data class HomeNewsMediaDto(
    val id: String,
    val url: String,
    val mimeType: String? = null,
    val type: String? = null,
    val fileName: String? = null
)
