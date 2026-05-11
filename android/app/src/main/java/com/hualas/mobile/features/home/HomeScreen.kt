package com.hualas.mobile.features.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.hualas.mobile.core.design.HualasTheme
import com.hualas.mobile.core.navigation.PrimaryDestination
import com.hualas.mobile.core.navigation.destinationsForRole
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.session.MobileSession
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.ActivitiesPanel
import com.hualas.mobile.features.activities.ActivitiesUiState
import com.hualas.mobile.features.activities.data.AvailableActivity
import com.hualas.mobile.features.home.data.HomeActivity
import com.hualas.mobile.features.home.data.HomeChild
import com.hualas.mobile.features.home.data.HomeNewsItem
import com.hualas.mobile.features.home.data.HomeProfile
import com.hualas.mobile.features.home.data.HomeStats
import com.hualas.mobile.features.home.data.HomeSummary
import com.hualas.mobile.features.home.data.HomeUpcomingDay

@Composable
fun HomeScreen(
    session: MobileSession,
    homeState: UiState<HomeSummary>,
    activitiesState: ActivitiesUiState = ActivitiesUiState(),
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onSwitchRole: (MobileRole) -> Unit,
    onLoadActivities: () -> Unit = {},
    onSelectActivityDay: (String) -> Unit = {},
    onLoadActivityDayDetail: (String) -> Unit = {},
    onStartActivityCheckout: (AvailableActivity) -> Unit = {},
    onCheckoutUrlConsumed: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val uriHandler = LocalUriHandler.current
    val home = (homeState as? UiState.Content)?.value
    val destinations = destinationsForRole(
        role = session.activeRole,
        unreadNotificationsCount = home?.stats?.unreadNotificationsCount ?: 0
    )
    var selectedDestinationId by remember(session.activeRole) { mutableStateOf("home") }

    LaunchedEffect(session.activeRole) {
        selectedDestinationId = "home"
    }

    LaunchedEffect(activitiesState.checkoutUrl) {
        val checkoutUrl = activitiesState.checkoutUrl
        if (!checkoutUrl.isNullOrBlank()) {
            uriHandler.openUri(checkoutUrl)
            onCheckoutUrlConsumed()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            PrimaryBottomNavigation(
                destinations = destinations,
                selectedDestinationId = selectedDestinationId,
                onDestinationSelected = { selectedDestinationId = it.id }
            )
        }
    ) { paddingValues ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (homeState) {
                UiState.Loading -> LoadingState()
                UiState.Empty -> EmptyState(onRetry)
                is UiState.Error -> ErrorState(homeState, onRetry)
                is UiState.Content -> HomeContent(
                    session = session,
                    home = homeState.value,
                    selectedDestinationId = selectedDestinationId,
                    isRefreshing = homeState.isRefreshing,
                    activitiesState = activitiesState,
                    onRefresh = onRefresh,
                    onLogout = onLogout,
                    onSwitchRole = onSwitchRole,
                    onLoadActivities = onLoadActivities,
                    onSelectActivityDay = onSelectActivityDay,
                    onLoadActivityDayDetail = onLoadActivityDayDetail,
                    onStartActivityCheckout = onStartActivityCheckout
                )
            }
        }
    }
}

@Composable
private fun HomeContent(
    session: MobileSession,
    home: HomeSummary,
    selectedDestinationId: String,
    isRefreshing: Boolean,
    activitiesState: ActivitiesUiState,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onSwitchRole: (MobileRole) -> Unit,
    onLoadActivities: () -> Unit,
    onSelectActivityDay: (String) -> Unit,
    onLoadActivityDayDetail: (String) -> Unit,
    onStartActivityCheckout: (AvailableActivity) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Header(
                session = session,
                profile = home.profile,
                isRefreshing = isRefreshing,
                onRefresh = onRefresh,
                onSwitchRole = onSwitchRole
            )
        }

        when (selectedDestinationId) {
            "home" -> {
                item { StatsSection(home) }
                item { SectionTitle("Próximos días") }
                if (home.upcomingDays.isEmpty()) {
                    item { PlainEmptyCard("No hay días próximos.") }
                } else {
                    items(home.upcomingDays, key = { it.id }) { day ->
                        UpcomingDayCard(day)
                    }
                }
                item { SectionTitle("Noticias recientes") }
                if (home.recentNews.isEmpty()) {
                    item { PlainEmptyCard("No hay novedades recientes.") }
                } else {
                    items(home.recentNews, key = { it.id }) { news ->
                        NewsCard(news)
                    }
                }
            }
            "activities" -> {
                item {
                    ActivitiesPanel(
                        role = session.activeRole,
                        state = activitiesState,
                        onRetry = onLoadActivities,
                        onSelectDay = onSelectActivityDay,
                        onLoadDayDetail = onLoadActivityDayDetail,
                        onStartCheckout = onStartActivityCheckout
                    )
                }
            }
            "family" -> {
                item { SectionTitle("Familia") }
                itemsOrEmpty(home.children, "No hay integrantes familiares cargados.") { child ->
                    ChildCard(child)
                }
            }
            "agenda" -> {
                item {
                    ActivitiesPanel(
                        role = session.activeRole,
                        state = activitiesState,
                        onRetry = onLoadActivities,
                        onSelectDay = onSelectActivityDay,
                        onLoadDayDetail = onLoadActivityDayDetail,
                        onStartCheckout = onStartActivityCheckout
                    )
                }
            }
            "attendance" -> {
                item { SectionTitle("Asistencia") }
                item {
                    AttentionCard(
                        title = "Pendientes",
                        value = home.stats.pendingAttendanceCount.toString(),
                        body = "Registros de asistencia sin cerrar."
                    )
                }
                itemsOrEmpty(home.upcomingDays, "No hay clases próximas.") { day ->
                    UpcomingDayCard(day)
                }
            }
            "groups" -> {
                item { SectionTitle("Grupos") }
                itemsOrEmpty(home.activities, "No hay grupos asignados.") { activity ->
                    ActivityCard(activity, showParticipant = false)
                }
            }
            "payments", "chat" -> {
                item { SectionTitle(selectedDestinationId.toSectionLabel()) }
                item { PlainEmptyCard("Sin datos para mostrar por ahora.") }
            }
            "more" -> {
                item { SectionTitle("Más") }
                item {
                    MoreCard(
                        session = session,
                        unreadNotificationsCount = home.stats.unreadNotificationsCount,
                        onLogout = onLogout,
                        onSwitchRole = onSwitchRole
                    )
                }
            }
        }
    }
}

private fun LazyColumnScopeMarker() = Unit

private inline fun <T> androidx.compose.foundation.lazy.LazyListScope.itemsOrEmpty(
    values: List<T>,
    emptyMessage: String,
    crossinline itemContent: @Composable (T) -> Unit
) {
    if (values.isEmpty()) {
        item { PlainEmptyCard(emptyMessage) }
    } else {
        items(values) { value -> itemContent(value) }
    }
}

@Composable
private fun Header(
    session: MobileSession,
    profile: HomeProfile,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onSwitchRole: (MobileRole) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Inicio",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = profile.name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            TextButton(onClick = onRefresh, enabled = !isRefreshing) {
                Text(if (isRefreshing) "Actualizando" else "Actualizar")
            }
        }
        if (session.allowedRoles.size > 1) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                session.allowedRoles.sortedBy { it.name }.forEach { role ->
                    AssistChip(
                        onClick = { onSwitchRole(role) },
                        label = {
                            Text(
                                if (role == MobileRole.PROFESSOR) {
                                    "Profesor"
                                } else {
                                    "Miembro"
                                }
                            )
                        },
                        enabled = role != session.activeRole
                    )
                }
            }
        }
    }
}

@Composable
private fun StatsSection(home: HomeSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard(
                title = if (home.role == MobileRole.MEMBER) "Familia" else "Actividades",
                value = if (home.role == MobileRole.MEMBER) {
                    home.stats.childrenCount.toString()
                } else {
                    home.stats.activitiesCount.toString()
                },
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "Próximos",
                value = home.stats.upcomingDaysCount.toString(),
                modifier = Modifier.weight(1f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard(
                title = if (home.role == MobileRole.MEMBER) "Actividades" else "Grupos",
                value = if (home.role == MobileRole.MEMBER) {
                    home.stats.activitiesCount.toString()
                } else {
                    home.stats.groupsCount.toString()
                },
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = if (home.role == MobileRole.MEMBER) "Avisos" else "Asistencia",
                value = if (home.role == MobileRole.MEMBER) {
                    home.stats.unreadNotificationsCount.toString()
                } else {
                    home.stats.pendingAttendanceCount.toString()
                },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun PrimaryBottomNavigation(
    destinations: List<PrimaryDestination>,
    selectedDestinationId: String,
    onDestinationSelected: (PrimaryDestination) -> Unit
) {
    NavigationBar {
        destinations.forEach { destination ->
            NavigationBarItem(
                selected = destination.id == selectedDestinationId,
                onClick = { onDestinationSelected(destination) },
                icon = {
                    BadgedBox(
                        badge = {
                            destination.badgeCount?.let {
                                Badge { Text(it.coerceAtMost(99).toString()) }
                            }
                        }
                    ) {
                        Text(
                            text = destination.iconText,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                },
                label = { Text(destination.label, maxLines = 1) }
            )
        }
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun UpcomingDayCard(day: HomeUpcomingDay) {
    HomeListCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = day.activityName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = listOfNotNull(day.date, day.schedule, day.groupName).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                day.geoLocation?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (day.cancelled) {
                Text(
                    text = "Suspendida",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun ActivityCard(
    activity: HomeActivity,
    showParticipant: Boolean
) {
    HomeListCard {
        Text(
            text = activity.name,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = listOfNotNull(activity.date, activity.frequency).joinToString(" · "),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (showParticipant && !activity.participantName.isNullOrBlank()) {
            Text(
                text = activity.participantName,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        activity.groupName?.takeIf { it.isNotBlank() }?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        activity.groupsCount?.let {
            Text(
                text = "$it grupos",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        activity.price?.let {
            Text(
                text = "$${it.toInt()}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun ChildCard(child: HomeChild) {
    HomeListCard {
        Text(
            text = child.fullName,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        child.birthDate?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun NewsCard(news: HomeNewsItem) {
    HomeListCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = news.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            if (!news.isRead) {
                Text(
                    text = "Nueva",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
        Text(
            text = news.body,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = listOf(news.author, news.createdAt).joinToString(" · "),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MoreCard(
    session: MobileSession,
    unreadNotificationsCount: Int,
    onLogout: () -> Unit,
    onSwitchRole: (MobileRole) -> Unit
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Notificaciones: $unreadNotificationsCount",
                style = MaterialTheme.typography.bodyMedium
            )
            if (session.allowedRoles.size > 1) {
                HorizontalDivider()
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    session.allowedRoles.sortedBy { it.name }.forEach { role ->
                        OutlinedButton(
                            onClick = { onSwitchRole(role) },
                            enabled = role != session.activeRole
                        ) {
                            Text(if (role == MobileRole.PROFESSOR) "Profesor" else "Miembro")
                        }
                    }
                }
            }
            Button(onClick = onLogout) {
                Text("Cerrar sesión")
            }
        }
    }
}

@Composable
private fun AttentionCard(title: String, value: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelMedium)
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(text = body, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun HomeListCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            content = content
        )
    }
}

@Composable
private fun PlainEmptyCard(message: String) {
    HomeListCard {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(top = 4.dp)
    )
}

@Composable
private fun LoadingState() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun EmptyState(onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("No hay datos de inicio.")
            Spacer(Modifier.height(8.dp))
            Button(onClick = onRetry) { Text("Reintentar") }
        }
    }
}

@Composable
private fun ErrorState(error: UiState.Error, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = error.message,
                style = MaterialTheme.typography.bodyMedium
            )
            if (error.retryable) {
                Button(onClick = onRetry) { Text("Reintentar") }
            }
        }
    }
}

private fun String.toSectionLabel(): String {
    return when (this) {
        "payments" -> "Pagos"
        "chat" -> "Chat"
        else -> "Inicio"
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    HualasTheme {
        HomeScreen(
            session = MobileSession(
                token = "token",
                userId = "user-1",
                activeRole = MobileRole.MEMBER,
                allowedRoles = setOf(MobileRole.MEMBER, MobileRole.PROFESSOR),
                expiresAt = null
            ),
            homeState = UiState.Content(previewHome()),
            onRetry = {},
            onRefresh = {},
            onLogout = {},
            onSwitchRole = {}
        )
    }
}

private fun previewHome() = HomeSummary(
    role = MobileRole.MEMBER,
    profile = HomeProfile("user-1", "Socia Hualas", "socia@hualas.test", null),
    stats = HomeStats(
        childrenCount = 2,
        activitiesCount = 3,
        upcomingDaysCount = 2,
        unreadNotificationsCount = 4
    ),
    children = listOf(HomeChild("child-1", "Nina", "Hualas", "2016-05-01", null)),
    activities = listOf(
        HomeActivity("activity-1", "Escalada", "2026-05-12", null, "Semanal", 12000.0, "Nina Hualas", "Grupo A", null)
    ),
    upcomingDays = listOf(
        HomeUpcomingDay("day-1", "activity-1", "Escalada", "Grupo A", "2026-05-12", "10:00", "SMA", false)
    ),
    recentNews = listOf(
        HomeNewsItem("news-1", "Salida al Chapelco", "Traer abrigo.", "CLUB", null, "Coordinación", "10/05/2026", false)
    )
)
