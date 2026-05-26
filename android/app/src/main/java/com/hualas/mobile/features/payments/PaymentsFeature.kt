package com.hualas.mobile.features.payments

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.family.PlaceholderFeatureScreen
import com.hualas.mobile.features.payments.data.MobilePaymentsSummary
import com.hualas.mobile.features.payments.data.MobilePaymentsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class PaymentsViewModel(
    private val repository: MobilePaymentsRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<MobilePaymentsSummary>>(UiState.Empty)
    val uiState: StateFlow<UiState<MobilePaymentsSummary>> = _uiState

    fun load() {
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            _uiState.value = when (val result = repository.loadPayments()) {
                is ApiResult.Success -> UiState.Content(result.value)
                is ApiResult.ValidationError -> UiState.Error(result.message)
                ApiResult.Unauthorized -> UiState.Error("Tu sesion vencio. Volve a ingresar.", retryable = false)
                ApiResult.Forbidden -> UiState.Error("No tenes permiso para ver pagos.", retryable = false)
                ApiResult.NotFound -> UiState.Empty
                is ApiResult.ServerError -> UiState.Error(result.message)
                is ApiResult.NetworkFailure -> UiState.Error(result.message)
            }
        }
    }
}

@Composable
fun PaymentsScreen(state: UiState<MobilePaymentsSummary>, onRetry: () -> Unit) {
    when (state) {
        UiState.Loading -> PlaceholderFeatureScreen("Pagos", "Cargando pagos...", onRetry)
        UiState.Empty -> PlaceholderFeatureScreen("Pagos", "Todavia no hay pagos para mostrar en la app.", onRetry)
        is UiState.Error -> PlaceholderFeatureScreen("Pagos", state.message, onRetry)
        is UiState.Content -> Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Pagos", style = MaterialTheme.typography.titleMedium)
            state.value.profile?.let { profile ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text("Datos de cobro", style = MaterialTheme.typography.titleSmall)
                        profile.bankName?.takeIf { it.isNotBlank() }?.let { Text("Banco: $it") }
                        profile.alias?.takeIf { it.isNotBlank() }?.let { Text("Alias: $it") }
                        profile.cbu?.takeIf { it.isNotBlank() }?.let { Text("CBU: $it") }
                        profile.cuit?.takeIf { it.isNotBlank() }?.let { Text("CUIT: $it") }
                    }
                }
            }
            if (state.value.payments.isEmpty()) {
                Text("No hay movimientos registrados.", style = MaterialTheme.typography.bodyMedium)
            } else {
                state.value.payments.forEach { payment ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(payment.title, style = MaterialTheme.typography.titleSmall)
                            Text(payment.amountLabel, style = MaterialTheme.typography.titleMedium)
                            payment.subtitle?.takeIf { it.isNotBlank() }?.let { Text(it) }
                            payment.date?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            Text(payment.status, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
    }
}
