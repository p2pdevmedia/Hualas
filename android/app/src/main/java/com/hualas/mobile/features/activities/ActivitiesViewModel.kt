package com.hualas.mobile.features.activities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.data.ActivitiesAgenda
import com.hualas.mobile.features.activities.data.ActivitiesRepository
import com.hualas.mobile.features.activities.data.ActivityDayDetail
import com.hualas.mobile.features.activities.data.AvailableActivities
import com.hualas.mobile.features.activities.data.CartQuoteResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ActivitiesUiState(
    val activeRole: MobileRole? = null,
    val selectedDay: String? = null,
    val summary: UiState<ActivitiesAgenda> = UiState.Loading,
    val agenda: UiState<ActivitiesAgenda> = UiState.Loading,
    val available: UiState<AvailableActivities>? = null,
    val dayDetail: UiState<ActivityDayDetail>? = null,
    val checkoutQuote: CartQuoteResponse? = null,
    val checkoutUrl: String? = null,
    val checkoutError: String? = null,
    val isCheckingOut: Boolean = false,
    val checkoutCompleted: Boolean = false
)

class ActivitiesViewModel(
    val repository: ActivitiesRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ActivitiesUiState())
    val uiState: StateFlow<ActivitiesUiState> = _uiState

    fun load(role: MobileRole) {
        _uiState.value = ActivitiesUiState(
            activeRole = role,
            available = if (role == MobileRole.MEMBER) UiState.Loading else null
        )

        viewModelScope.launch {
            val summary = repository.loadAgendaSummary().toUiState()
            val agenda = repository.loadAgenda().toUiState()
            val available = if (role == MobileRole.MEMBER) {
                repository.loadAvailableActivities().toUiState()
            } else {
                null
            }

            _uiState.update {
                it.copy(summary = summary, agenda = agenda, available = available)
            }
        }
    }

    fun selectDay(day: String) {
        _uiState.update {
            it.copy(selectedDay = day, agenda = UiState.Loading, dayDetail = null)
        }

        viewModelScope.launch {
            val agenda = repository.loadAgenda(day).toUiState()
            _uiState.update { it.copy(agenda = agenda) }
        }
    }

    fun loadDayDetail(dayId: String) {
        _uiState.update { it.copy(dayDetail = UiState.Loading) }

        viewModelScope.launch {
            val detail = repository.loadDayDetail(dayId).toUiState()
            _uiState.update { it.copy(dayDetail = detail) }
        }
    }

    fun consumeCheckoutUrl() {
        _uiState.update { it.copy(checkoutUrl = null) }
    }

    private fun <T> ApiResult<T>.toUiState(): UiState<T> {
        return when (this) {
            is ApiResult.Success -> UiState.Content(value)
            ApiResult.Unauthorized -> UiState.Error("Tu sesión venció. Volvé a iniciar sesión.", retryable = false)
            ApiResult.Forbidden -> UiState.Error("No tenés acceso a esta información.", retryable = false)
            ApiResult.NotFound -> UiState.Empty
            is ApiResult.ValidationError -> UiState.Error(message, retryable = false)
            is ApiResult.ServerError -> UiState.Error(message, retryable = true)
            is ApiResult.NetworkFailure -> UiState.Error(
                message = "No se pudo cargar la información. Revisá tu conexión.",
                retryable = true
            )
        }
    }

}
