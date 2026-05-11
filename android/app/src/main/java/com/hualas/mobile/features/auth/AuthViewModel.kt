package com.hualas.mobile.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.session.MobileRole
import com.hualas.mobile.features.auth.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class AuthViewModel(
    private val repository: AuthRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState

    fun updateEmail(email: String) {
        _uiState.update { it.copy(email = email, errorMessage = null) }
    }

    fun updatePassword(password: String) {
        _uiState.update { it.copy(password = password, errorMessage = null) }
    }

    fun login() {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _uiState.update {
                it.copy(errorMessage = "Ingresá tu email y contraseña")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.login(state.email, state.password)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = result.toUserMessage()
                )
            }
        }
    }

    fun restore() {
        viewModelScope.launch {
            repository.restore()
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
        }
    }

    fun switchRole(role: MobileRole) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.switchRole(role)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = result.toUserMessage()
                )
            }
        }
    }

    private fun ApiResult<*>.toUserMessage(): String? {
        return when (this) {
            is ApiResult.Success -> null
            ApiResult.Unauthorized -> "Credenciales inválidas"
            ApiResult.Forbidden -> "No tenés acceso a ese perfil"
            ApiResult.NotFound -> "No encontramos esa información"
            is ApiResult.ValidationError -> message
            is ApiResult.ServerError -> message
            is ApiResult.NetworkFailure -> "No se pudo conectar con Hualas. Revisá tu conexión."
        }
    }
}
