package com.hualas.mobile.features.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.family.PlaceholderFeatureScreen
import com.hualas.mobile.features.notifications.data.MobileNotificationsInbox
import com.hualas.mobile.features.notifications.data.MobileNotificationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NotificationsViewModel(
    private val repository: MobileNotificationsRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<MobileNotificationsInbox>>(UiState.Empty)
    val uiState: StateFlow<UiState<MobileNotificationsInbox>> = _uiState

    fun load() {
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            _uiState.value = when (val result = repository.loadNotifications()) {
                is ApiResult.Success -> if (result.value.notifications.isEmpty()) UiState.Empty else UiState.Content(result.value)
                is ApiResult.ValidationError -> UiState.Error(result.message)
                ApiResult.Unauthorized -> UiState.Error("Tu sesion vencio. Volve a ingresar.", retryable = false)
                ApiResult.Forbidden -> UiState.Error("No tenes permiso para ver notificaciones.", retryable = false)
                ApiResult.NotFound -> UiState.Empty
                is ApiResult.ServerError -> UiState.Error(result.message)
                is ApiResult.NetworkFailure -> UiState.Error(result.message)
            }
        }
    }

    fun markRead(id: String) {
        if (id.isBlank()) return
        viewModelScope.launch {
            if (repository.markRead(id) is ApiResult.Success) load()
        }
    }
}

@Composable
fun NotificationsScreen(state: UiState<MobileNotificationsInbox>, onRetry: () -> Unit, onMarkRead: (String) -> Unit) {
    when (state) {
        UiState.Loading -> PlaceholderFeatureScreen("Notificaciones", "Cargando notificaciones...", onRetry)
        UiState.Empty -> PlaceholderFeatureScreen("Notificaciones", "No tenes notificaciones por ahora.", onRetry)
        is UiState.Error -> PlaceholderFeatureScreen("Notificaciones", state.message, onRetry)
        is UiState.Content -> Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Notificaciones", style = MaterialTheme.typography.titleMedium)
            state.value.notifications.forEach { notification ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(
                                notification.title,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f)
                            )
                            if (notification.readAt == null) {
                                TextButton(onClick = { onMarkRead(notification.id) }) {
                                    Text("Leida")
                                }
                            }
                        }
                        Text(notification.body, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            notification.createdAt,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
