package com.hualas.mobile.features.family

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.family.data.MobileFamilySummary
import com.hualas.mobile.features.family.data.MobileFamilyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class FamilyViewModel(
    private val repository: MobileFamilyRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<MobileFamilySummary>>(UiState.Empty)
    val uiState: StateFlow<UiState<MobileFamilySummary>> = _uiState

    fun load() {
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            _uiState.value = when (val result = repository.loadFamily()) {
                is ApiResult.Success -> if (
                    result.value.children.isEmpty() && result.value.members.isEmpty()
                ) {
                    UiState.Empty
                } else {
                    UiState.Content(result.value)
                }
                is ApiResult.ValidationError -> UiState.Error(result.message)
                ApiResult.Unauthorized -> UiState.Error("Tu sesion vencio. Volve a ingresar.", retryable = false)
                ApiResult.Forbidden -> UiState.Error("No tenes permiso para ver esta seccion.", retryable = false)
                ApiResult.NotFound -> UiState.Empty
                is ApiResult.ServerError -> UiState.Error(result.message)
                is ApiResult.NetworkFailure -> UiState.Error(result.message)
            }
        }
    }
}

@Composable
fun FamilyScreen(state: UiState<MobileFamilySummary>, onRetry: () -> Unit) {
    when (state) {
        UiState.Loading -> PlaceholderFeatureScreen("Hijos", "Cargando familia...", onRetry)
        UiState.Empty -> PlaceholderFeatureScreen("Hijos", "Todavia no hay hijos o tutores cargados.", onRetry)
        is UiState.Error -> PlaceholderFeatureScreen("Hijos", state.message, onRetry)
        is UiState.Content -> Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(text = "Hijos", style = MaterialTheme.typography.titleMedium)
            if (state.value.children.isEmpty()) {
                Text("No hay hijos cargados.", style = MaterialTheme.typography.bodyMedium)
            } else {
                state.value.children.forEach { child ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(child.name, style = MaterialTheme.typography.titleSmall)
                            child.birthDate?.let { Text("Nacimiento: $it") }
                            child.documentNumber?.let { Text("DNI: $it") }
                            child.allergies?.takeIf { it.isNotBlank() }?.let { Text("Alergias: $it") }
                            child.doctorPhone?.takeIf { it.isNotBlank() }?.let { Text("Medico: $it") }
                        }
                    }
                }
            }

            HorizontalDivider()
            Text(text = "Tutores", style = MaterialTheme.typography.titleMedium)
            if (state.value.members.isEmpty()) {
                Text("No hay tutores adicionales.", style = MaterialTheme.typography.bodyMedium)
            } else {
                state.value.members.forEach { member ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(member.name, style = MaterialTheme.typography.titleSmall)
                            Text(member.email, style = MaterialTheme.typography.bodySmall)
                            if (member.isPaymentResponsible) {
                                Text("Responsable de pago", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun PlaceholderFeatureScreen(title: String, body: String, onRetry: () -> Unit = {}) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp)
        )
        Button(onClick = onRetry, modifier = Modifier.padding(top = 12.dp)) {
            Text("Actualizar")
        }
    }
}

internal fun UiState<String>.messageOr(emptyMessage: String): String {
    return when (this) {
        UiState.Empty -> emptyMessage
        UiState.Loading -> "Cargando..."
        is UiState.Error -> message
        is UiState.Content -> value
    }
}
