package com.hualas.mobile.features.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.home.data.HomeRepository
import com.hualas.mobile.features.home.data.HomeSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(
    private val repository: HomeRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<HomeSummary>>(UiState.Loading)
    val uiState: StateFlow<UiState<HomeSummary>> = _uiState

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            _uiState.value = repository.loadHome().toUiState()
        }
    }

    fun refresh() {
        _uiState.update { state ->
            if (state is UiState.Content) {
                state.copy(isRefreshing = true)
            } else {
                UiState.Loading
            }
        }
        viewModelScope.launch {
            _uiState.value = repository.loadHome().toUiState()
        }
    }

    private fun ApiResult<HomeSummary>.toUiState(): UiState<HomeSummary> {
        return when (this) {
            is ApiResult.Success -> UiState.Content(value)
            ApiResult.Unauthorized -> UiState.Error("Tu sesión venció. Volvé a iniciar sesión.", retryable = false)
            ApiResult.Forbidden -> UiState.Error("No tenés acceso a este inicio.", retryable = false)
            ApiResult.NotFound -> UiState.Empty
            is ApiResult.ValidationError -> UiState.Error(message, retryable = false)
            is ApiResult.ServerError -> UiState.Error(message, retryable = true)
            is ApiResult.NetworkFailure -> UiState.Error(
                message = "No se pudo cargar el inicio. Revisá tu conexión.",
                retryable = true
            )
        }
    }
}
