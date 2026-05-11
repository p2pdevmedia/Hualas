package com.hualas.mobile.features.home.data

import com.hualas.mobile.core.session.MobileRole

data class HomeSummary(
    val role: MobileRole,
    val profile: HomeProfile,
    val stats: HomeStats,
    val children: List<HomeChild>,
    val activities: List<HomeActivity>,
    val upcomingDays: List<HomeUpcomingDay>,
    val recentNews: List<HomeNewsItem>
)

data class HomeProfile(
    val id: String,
    val name: String,
    val email: String,
    val birthDate: String?
)

data class HomeStats(
    val childrenCount: Int = 0,
    val activitiesCount: Int = 0,
    val groupsCount: Int = 0,
    val upcomingDaysCount: Int = 0,
    val pendingAttendanceCount: Int = 0,
    val unreadNotificationsCount: Int = 0
)

data class HomeChild(
    val id: String,
    val name: String,
    val lastName: String?,
    val birthDate: String?,
    val profilePhoto: String?
) {
    val fullName: String = listOfNotNull(name, lastName)
        .filter { it.isNotBlank() }
        .joinToString(" ")
}

data class HomeActivity(
    val id: String,
    val name: String,
    val date: String?,
    val endDate: String?,
    val frequency: String?,
    val price: Double?,
    val participantName: String?,
    val groupName: String?,
    val groupsCount: Int?
)

data class HomeUpcomingDay(
    val id: String,
    val activityId: String,
    val activityName: String,
    val groupName: String?,
    val date: String,
    val schedule: String?,
    val geoLocation: String?,
    val cancelled: Boolean
)

data class HomeNewsItem(
    val id: String,
    val title: String,
    val body: String,
    val scope: String,
    val activityName: String?,
    val author: String,
    val createdAt: String,
    val isRead: Boolean
)
