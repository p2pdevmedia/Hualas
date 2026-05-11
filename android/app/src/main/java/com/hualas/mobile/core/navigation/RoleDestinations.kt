package com.hualas.mobile.core.navigation

import com.hualas.mobile.core.session.MobileRole

data class PrimaryDestination(
    val id: String,
    val label: String,
    val iconText: String,
    val badgeCount: Int? = null
)

fun destinationsForRole(
    role: MobileRole,
    unreadNotificationsCount: Int = 0
): List<PrimaryDestination> {
    val moreBadge = unreadNotificationsCount.takeIf { it > 0 }
    return when (role) {
        MobileRole.MEMBER -> listOf(
            PrimaryDestination(id = "home", label = "Inicio", iconText = "IN"),
            PrimaryDestination(id = "activities", label = "Actividades", iconText = "AC"),
            PrimaryDestination(id = "family", label = "Familia", iconText = "FA"),
            PrimaryDestination(id = "payments", label = "Pagos", iconText = "$"),
            PrimaryDestination(id = "chat", label = "Chat", iconText = "CH"),
            PrimaryDestination(id = "more", label = "Más", iconText = "MA", badgeCount = moreBadge)
        )
        MobileRole.PROFESSOR -> listOf(
            PrimaryDestination(id = "home", label = "Inicio", iconText = "IN"),
            PrimaryDestination(id = "agenda", label = "Agenda", iconText = "AG"),
            PrimaryDestination(id = "attendance", label = "Asistencia", iconText = "AS"),
            PrimaryDestination(id = "groups", label = "Grupos", iconText = "GR"),
            PrimaryDestination(id = "chat", label = "Chat", iconText = "CH"),
            PrimaryDestination(id = "more", label = "Más", iconText = "MA", badgeCount = moreBadge)
        )
    }
}
