package com.hualas.mobile.features.activities

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.data.ActivitiesAgenda
import com.hualas.mobile.features.activities.data.ActivityDayDetail
import com.hualas.mobile.features.activities.data.ActivitySession
import com.hualas.mobile.features.activities.data.AvailableActivities
import com.hualas.mobile.features.activities.data.AvailableActivity
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

@Composable
fun ActivitiesPanel(
    role: MobileRole,
    state: ActivitiesUiState,
    onRetry: () -> Unit,
    onSelectDay: (String) -> Unit,
    onLoadDayDetail: (String) -> Unit,
    onOpenPurchaseDetail: (AvailableActivity) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SectionHeader(
            title = if (role == MobileRole.MEMBER) "Actividades" else "Agenda",
            actionLabel = "Actualizar",
            onAction = onRetry
        )
        DaySummaryRow(
            summaryState = state.summary,
            selectedDay = state.selectedDay,
            onSelectDay = onSelectDay
        )
        AgendaState(
            agendaState = state.agenda,
            onRetry = onRetry,
            onLoadDayDetail = onLoadDayDetail
        )
        DayDetailState(state.dayDetail)
        if (role == MobileRole.MEMBER) {
            AvailableActivitiesState(
                availableState = state.available,
                isCheckingOut = state.isCheckingOut,
                checkoutTotal = state.checkoutQuote?.totalAmountWithMercadoPagoFee,
                checkoutError = state.checkoutError,
                onRetry = onRetry,
                onOpenPurchaseDetail = onOpenPurchaseDetail
            )
        }
    }
}

@Composable
private fun SectionHeader(title: String, actionLabel: String, onAction: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        TextButton(onClick = onAction) {
            Text(actionLabel)
        }
    }
}

@Composable
private fun DaySummaryRow(
    summaryState: UiState<ActivitiesAgenda>,
    selectedDay: String?,
    onSelectDay: (String) -> Unit
) {
    when (summaryState) {
        UiState.Loading -> InlineLoading("Cargando días...")
        UiState.Empty -> InlineEmpty("No hay días en los próximos 30 días.")
        is UiState.Error -> InlineError(summaryState.message)
        is UiState.Content -> {
            if (summaryState.value.days.isEmpty()) {
                InlineEmpty("No hay días en los próximos 30 días.")
            } else {
                ActivityCalendarCard(
                    agenda = summaryState.value,
                    selectedDay = selectedDay,
                    onSelectDay = onSelectDay
                )
            }
        }
    }
}

@Composable
private fun ActivityCalendarCard(
    agenda: ActivitiesAgenda,
    selectedDay: String?,
    onSelectDay: (String) -> Unit
) {
    val today = remember { LocalDate.now().toString() }
    val calendarDays = remember(agenda.days) {
        agenda.days.map { ActivityCalendarDay(it.date, it.sessionCount) }
    }
    val resolvedSelectedDay = remember(calendarDays, selectedDay, today) {
        resolveSelectedActivityCalendarDay(calendarDays, selectedDay, today)
    }
    val calendarCells = remember(calendarDays, resolvedSelectedDay, today) {
        buildActivityCalendarCells(calendarDays, resolvedSelectedDay, today)
    }

    if (calendarCells.isEmpty() || resolvedSelectedDay == null) {
        InlineEmpty("No hay días en los próximos 30 días.")
        return
    }

    StageCard {
        CalendarHeader(
            monthLabel = agenda.monthLabel,
            selectedDay = resolvedSelectedDay,
            sessionCount = calendarDays.firstOrNull { it.date == resolvedSelectedDay }?.sessionCount ?: 0
        )
        WeekdayHeader()
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            calendarCells.chunked(7).forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    week.forEach { cell ->
                        CalendarDayCell(
                            cell = cell,
                            onSelectDay = onSelectDay,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
        Text(
            text = "Tocá un día con sesiones para ver la agenda.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun CalendarHeader(
    monthLabel: String,
    selectedDay: String,
    sessionCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = selectedDayTitle(selectedDay),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = monthLabel,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            dayBadge(selectedDay)?.let { badge ->
                Text(
                    text = badge,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            CircleShape
                        )
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                )
            }
            Text(
                text = "$sessionCount sesión${if (sessionCount == 1) "" else "es"}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun WeekdayHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        weekdaySymbols.forEach { symbol ->
            Text(
                text = symbol,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun CalendarDayCell(
    cell: ActivityCalendarCell,
    onSelectDay: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val hasSessions = cell.sessionCount > 0
    val enabled = cell.isCurrentMonth && hasSessions
    val backgroundColor = calendarCellBackground(cell, hasSessions)
    val borderColor = when {
        cell.isToday -> MaterialTheme.colorScheme.primary
        cell.isSelected -> MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
        else -> Color.Transparent
    }
    val textColor = when {
        !cell.isCurrentMonth -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)
        cell.isSelected -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurface
    }

    Column(
        modifier = modifier
            .aspectRatio(1f)
            .background(backgroundColor, RoundedCornerShape(14.dp))
            .border(1.dp, borderColor, RoundedCornerShape(14.dp))
            .clickable(enabled = enabled) { onSelectDay(cell.date) }
            .padding(6.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Text(
                text = cell.dayOfMonth.toString(),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (cell.isSelected || cell.isToday) FontWeight.SemiBold else FontWeight.Medium,
                color = textColor
            )
            if (cell.isToday) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                )
            }
        }

        if (hasSessions) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(minOf(3, cell.sessionCount)) { index ->
                    Box(
                        modifier = Modifier
                            .size(5.dp)
                            .background(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.85f - index * 0.15f),
                                CircleShape
                            )
                    )
                }
                if (cell.sessionCount > 3) {
                    Text(
                        text = "+${cell.sessionCount - 3}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun calendarCellBackground(
    cell: ActivityCalendarCell,
    hasSessions: Boolean
): Color {
    return when {
        cell.isSelected -> MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
        hasSessions -> MaterialTheme.colorScheme.primary.copy(alpha = 0.09f)
        cell.isCurrentMonth -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
    }
}

@Composable
private fun AgendaState(
    agendaState: UiState<ActivitiesAgenda>,
    onRetry: () -> Unit,
    onLoadDayDetail: (String) -> Unit
) {
    when (agendaState) {
        UiState.Loading -> InlineLoading("Cargando agenda...")
        UiState.Empty -> InlineEmpty("No hay actividades para mostrar.")
        is UiState.Error -> RetryCard(agendaState.message, agendaState.retryable, onRetry)
        is UiState.Content -> {
            Text(
                text = agendaState.value.monthLabel,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (agendaState.value.sessions.isEmpty()) {
                InlineEmpty("No hay actividades para ese día.")
            } else {
                agendaState.value.sessions.forEach { session ->
                    ActivitySessionCard(session, onLoadDayDetail)
                }
            }
        }
    }
}

@Composable
private fun ActivitySessionCard(
    session: ActivitySession,
    onLoadDayDetail: (String) -> Unit
) {
    StageCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = session.activityName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = listOfNotNull(session.date, session.schedule, session.groupName)
                        .joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                session.audienceLabel?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (session.cancelled) {
                StatusLabel("Suspendida", isError = true)
            }
        }
        session.geoLocation?.takeIf { it.isNotBlank() }?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        OutlinedButton(onClick = { onLoadDayDetail(session.id) }) {
            Text("Ver detalle")
        }
    }
}

@Composable
private fun DayDetailState(detailState: UiState<ActivityDayDetail>?) {
    when (detailState) {
        null -> Unit
        UiState.Loading -> InlineLoading("Cargando detalle...")
        UiState.Empty -> InlineEmpty("No encontramos ese día.")
        is UiState.Error -> InlineError(detailState.message)
        is UiState.Content -> DayDetailCard(detailState.value)
    }
}

@Composable
private fun DayDetailCard(detail: ActivityDayDetail) {
    StageCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = detail.day.activity.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = listOfNotNull(detail.day.date, detail.day.schedule, detail.day.groupName)
                        .joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (detail.day.cancelled) {
                StatusLabel("Suspendida", isError = true)
            }
        }
        detail.day.cancellationReason?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }
        detail.day.description?.takeIf { it.isNotBlank() }?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (detail.professors.isNotEmpty()) {
            Text(
                text = "Profes: ${detail.professors.joinToString { it.label }}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        if (detail.participants.isNotEmpty()) {
            Text(
                text = "Participantes",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
            detail.participants.take(6).forEach { participant ->
                Text(
                    text = listOfNotNull(
                        participant.label,
                        participant.groupName,
                        participant.attendance.status
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun AvailableActivitiesState(
    availableState: UiState<AvailableActivities>?,
    isCheckingOut: Boolean,
    checkoutTotal: Double?,
    checkoutError: String?,
    onRetry: () -> Unit,
    onOpenPurchaseDetail: (AvailableActivity) -> Unit
) {
    Text(
        text = "Disponibles",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold
    )
    checkoutTotal?.let {
        InlineEmpty("Cotización: $${it.toInt()}. El pago se abre fuera de la app.")
    }
    checkoutError?.let {
        InlineError(it)
    }
    when (availableState) {
        null -> Unit
        UiState.Loading -> InlineLoading("Cargando actividades disponibles...")
        UiState.Empty -> InlineEmpty("No hay actividades disponibles.")
        is UiState.Error -> RetryCard(availableState.message, availableState.retryable, onRetry)
        is UiState.Content -> {
            if (availableState.value.activities.isEmpty()) {
                InlineEmpty("No hay actividades disponibles.")
            } else {
                availableState.value.activities.forEach { activity ->
                    AvailableActivityCard(
                        activity = activity,
                        isCheckingOut = isCheckingOut,
                        onOpenPurchaseDetail = onOpenPurchaseDetail
                    )
                }
            }
        }
    }
}

@Composable
private fun AvailableActivityCard(
    activity: AvailableActivity,
    isCheckingOut: Boolean,
    onOpenPurchaseDetail: (AvailableActivity) -> Unit
) {
    StageCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = activity.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = listOf(activity.date, activity.frequency, "$${activity.price.toInt()}")
                        .joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            StatusLabel(activity.availabilityLabel, isError = !activity.hasAvailability)
        }
        activity.description?.takeIf { it.isNotBlank() }?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (activity.groups.isNotEmpty()) {
            Text(
                text = activity.groups.joinToString { group ->
                    val remaining = group.remainingCapacity?.let { "$it cupos" } ?: "sin cupo definido"
                    "${group.name} · $remaining"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        if (activity.days.isNotEmpty()) {
            Text(
                text = activity.days.take(3).joinToString { day ->
                    listOfNotNull(day.date, day.schedule, day.groupName).joinToString(" · ")
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Button(
            onClick = { onOpenPurchaseDetail(activity) },
            enabled = activity.hasAvailability && !isCheckingOut
        ) {
            Text(if (isCheckingOut) "Preparando..." else "Ver opciones")
        }
    }
}

@Composable
private fun StageCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            content = content
        )
    }
}

@Composable
private fun StatusLabel(label: String, isError: Boolean = false) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
        modifier = Modifier.widthIn(max = 110.dp)
    )
}

@Composable
private fun InlineLoading(message: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator()
        Text(message, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun InlineEmpty(message: String) {
    StageCard {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun InlineError(message: String) {
    StageCard {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error
        )
    }
}

@Composable
private fun RetryCard(message: String, retryable: Boolean, onRetry: () -> Unit) {
    StageCard {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error
        )
        if (retryable) {
            OutlinedButton(onClick = onRetry) {
                Text("Reintentar")
            }
        }
    }
}

private val weekdaySymbols = listOf("Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom")

private val isoDayFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

private val prettyDayFormatter: DateTimeFormatter = DateTimeFormatter
    .ofPattern("EEEE d MMMM", Locale("es", "AR"))

private fun selectedDayTitle(dayKey: String): String {
    return parseDay(dayKey)
        ?.format(prettyDayFormatter)
        ?.replaceFirstChar { it.titlecase(Locale("es", "AR")) }
        ?: "Día seleccionado"
}

private fun dayBadge(dayKey: String): String? {
    val date = parseDay(dayKey) ?: return null
    val today = LocalDate.now()
    return when (date) {
        today -> "Hoy"
        today.plusDays(1) -> "Mañana"
        else -> null
    }
}

private fun parseDay(dayKey: String): LocalDate? {
    return try {
        LocalDate.parse(dayKey, isoDayFormatter)
    } catch (_: DateTimeParseException) {
        null
    }
}
