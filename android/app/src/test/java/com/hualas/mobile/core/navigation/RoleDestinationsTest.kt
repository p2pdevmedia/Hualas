package com.hualas.mobile.core.navigation

import com.hualas.mobile.core.session.MobileRole
import org.junit.Assert.assertEquals
import org.junit.Test

class RoleDestinationsTest {
    @Test
    fun memberOnlySeesMemberDestinations() {
        assertEquals(
            listOf("Inicio", "Mis actividades", "Hijos", "Pagos", "Chat", "Más"),
            destinationsForRole(MobileRole.MEMBER).map { it.label }
        )
    }

    @Test
    fun professorOnlySeesProfessorDestinations() {
        assertEquals(
            listOf("Mis actividades", "Grupos", "Asistencia", "Perfil"),
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
