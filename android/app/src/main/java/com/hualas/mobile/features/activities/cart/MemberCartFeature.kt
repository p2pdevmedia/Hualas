package com.hualas.mobile.features.activities.cart

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.features.activities.data.ActivitiesRepository
import com.hualas.mobile.features.activities.data.CartItemRequest
import com.hualas.mobile.features.activities.data.CartQuoteResponse
import com.hualas.mobile.features.activities.purchase.ActivityPurchaseSelection
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MemberCartItem(
    val activityId: String,
    val label: String,
    val target: String? = null,
    val groupId: String? = null,
    val activityDayId: String? = null
) {
    fun toRequest(): CartItemRequest = CartItemRequest(
        activityId = activityId,
        target = target,
        targetLabel = label,
        groupId = groupId,
        activityDayId = activityDayId
    )

    companion object {
        fun fromSelection(selection: ActivityPurchaseSelection): MemberCartItem {
            val activity = requireNotNull(selection.activity)
            return MemberCartItem(
                activityId = activity.id,
                label = activity.name,
                target = selection.selectedTarget,
                groupId = selection.selectedGroupId,
                activityDayId = selection.selectedDayId
            )
        }
    }
}

class MemberCartStore {
    private val _items = MutableStateFlow<List<MemberCartItem>>(emptyList())
    val items: StateFlow<List<MemberCartItem>> = _items

    fun add(item: MemberCartItem) {
        _items.update { it + item }
    }

    fun removeAt(index: Int) {
        _items.update { current -> current.filterIndexed { i, _ -> i != index } }
    }
}

data class MemberCartUiState(
    val items: List<MemberCartItem> = emptyList(),
    val quote: CartQuoteResponse? = null,
    val checkoutUrl: String? = null,
    val error: String? = null,
    val loading: Boolean = false
)

class MemberCartViewModel(
    private val repository: ActivitiesRepository,
    private val cartStore: MemberCartStore
) : ViewModel() {
    private val _uiState = MutableStateFlow(MemberCartUiState(items = cartStore.items.value))
    val uiState: StateFlow<MemberCartUiState> = _uiState

    fun removeAt(index: Int) {
        cartStore.removeAt(index)
        _uiState.update { it.copy(items = cartStore.items.value) }
    }

    fun loadQuote() {
        _uiState.update { it.copy(loading = true, error = null, items = cartStore.items.value) }
        viewModelScope.launch {
            when (val result = repository.quoteCart(cartStore.items.value.map { it.toRequest() })) {
                is ApiResult.Success -> _uiState.update { it.copy(quote = result.value, loading = false) }
                else -> _uiState.update { it.copy(error = "No se pudo cotizar el carrito.", loading = false) }
            }
        }
    }

    fun checkout() {
        _uiState.update { it.copy(loading = true, error = null, items = cartStore.items.value) }
        viewModelScope.launch {
            when (val result = repository.startCheckout(cartStore.items.value.map { it.toRequest() })) {
                is ApiResult.Success -> _uiState.update {
                    it.copy(checkoutUrl = result.value.redirectUrl, loading = false)
                }
                else -> _uiState.update { it.copy(error = "No se pudo iniciar el pago.", loading = false) }
            }
        }
    }

    fun consumeCheckoutUrl() {
        _uiState.update { it.copy(checkoutUrl = null) }
    }
}

@Composable
fun MemberCartScreen(
    state: MemberCartUiState,
    onBack: () -> Unit,
    onRemoveAt: (Int) -> Unit,
    onLoadQuote: () -> Unit,
    onCheckout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(text = "Carrito", style = MaterialTheme.typography.titleMedium)
        if (state.items.isEmpty()) {
            Text("No hay actividades en el carrito.", modifier = Modifier.padding(top = 8.dp))
        } else {
            state.items.forEachIndexed { index, item ->
                Text("${index + 1}. ${item.label}", modifier = Modifier.padding(top = 8.dp))
            }
        }
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(onClick = onLoadQuote, modifier = Modifier.padding(top = 12.dp)) {
            Text(if (state.loading) "Cargando..." else "Cotizar")
        }
        Button(onClick = onCheckout, modifier = Modifier.padding(top = 8.dp)) {
            Text("Pagar")
        }
        Button(onClick = {
            if (state.items.isNotEmpty()) onRemoveAt(state.items.lastIndex)
        }, modifier = Modifier.padding(top = 8.dp)) {
            Text("Quitar ultima")
        }
        Button(onClick = onBack, modifier = Modifier.padding(top = 8.dp)) {
            Text("Volver")
        }
    }
}
