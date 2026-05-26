package com.hualas.mobile.core.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector
import com.hualas.mobile.core.session.MobileRole

data class PrimaryDestination(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val badgeCount: Int? = null
)

fun destinationsForRole(
    role: MobileRole,
    unreadNotificationsCount: Int = 0
): List<PrimaryDestination> {
    val moreBadge = unreadNotificationsCount.takeIf { it > 0 }
    return when (role) {
        MobileRole.MEMBER -> listOf(
            PrimaryDestination(id = "home", label = "Inicio", icon = Icons.Default.Home),
            PrimaryDestination(id = "activities", label = "Mis actividades", icon = Icons.Default.DateRange),
            PrimaryDestination(id = "family", label = "Hijos", icon = Icons.Default.Group),
            PrimaryDestination(id = "payments", label = "Pagos", icon = Icons.Default.CreditCard),
            PrimaryDestination(id = "chat", label = "Chat", icon = Icons.Default.MailOutline),
            PrimaryDestination(id = "more", label = "Más", icon = Icons.Default.MoreVert, badgeCount = moreBadge)
        )
        MobileRole.PROFESSOR -> listOf(
            PrimaryDestination(id = "agenda", label = "Mis actividades", icon = Icons.Default.DateRange),
            PrimaryDestination(id = "groups", label = "Grupos", icon = Icons.Default.Group),
            PrimaryDestination(id = "attendance", label = "Asistencia", icon = Icons.Default.Check),
            PrimaryDestination(id = "profile", label = "Perfil", icon = Icons.Default.Person, badgeCount = moreBadge)
        )
    }
}
