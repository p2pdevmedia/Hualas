package com.hualas.mobile.features.activities

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.data.ActivitiesAgenda
import com.hualas.mobile.features.activities.data.ActivityDayDetail
import com.hualas.mobile.features.activities.data.ActivitySession
import com.hualas.mobile.features.activities.data.AvailableActivities
import com.hualas.mobile.features.activities.data.AvailableActivity

@Composable
fun ActivitiesPanel(
    role: MobileRole,
    state: ActivitiesUiState,
    onRetry: () -> Unit,
    onSelectDay: (String) -> Unit,
    onLoadDayDetail: (String) -> Unit,
    onStartCheckout: (AvailableActivity) -> Unit,
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
                onStartCheckout = onStartCheckout
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    summaryState.value.days.forEach { day ->
                        AssistChip(
                            onClick = { onSelectDay(day.date) },
                            label = {
                                Text(
                                    text = "${day.date} (${day.sessionCount})",
                                    maxLines = 1
                                )
                            },
                            enabled = day.date != selectedDay
                        )
                    }
                }
            }
        }
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
    onStartCheckout: (AvailableActivity) -> Unit
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
                        onStartCheckout = onStartCheckout
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
    onStartCheckout: (AvailableActivity) -> Unit
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
            onClick = { onStartCheckout(activity) },
            enabled = activity.hasAvailability && !isCheckingOut
        ) {
            Text(if (isCheckingOut) "Preparando..." else "Cotizar e inscribirme")
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
