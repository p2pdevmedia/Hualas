package com.hualas.mobile.core.navigation

import com.hualas.mobile.core.session.MobileRole
import org.junit.Assert.assertEquals
import org.junit.Test

class RoleDestinationsTest {
    @Test
    fun memberOnlySeesMemberDestinations() {
        assertEquals(
            listOf("Inicio", "Actividades", "Familia", "Pagos", "Chat", "Más"),
            destinationsForRole(MobileRole.MEMBER).map { it.label }
        )
    }

    @Test
    fun professorOnlySeesProfessorDestinations() {
        assertEquals(
            listOf("Inicio", "Agenda", "Asistencia", "Grupos", "Chat", "Más"),
            destinationsForRole(MobileRole.PROFESSOR).map { it.label }
        )
    }

    @Test
    fun unreadNotificationCountIsShownOnMoreDestinationOnly() {
        val destinations = destinationsForRole(
            role = MobileRole.MEMBER,
            unreadNotificationsCount = 4
        )

        assertEquals(
            listOf(null, null, null, null, null, 4),
            destinations.map { it.badgeCount }
        )
    }
}
