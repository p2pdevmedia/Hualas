package com.hualas.mobile.features.professor.groups

import androidx.compose.runtime.Composable
import androidx.lifecycle.ViewModel
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.family.PlaceholderFeatureScreen
import com.hualas.mobile.features.family.messageOr
import com.hualas.mobile.features.professor.data.MobileProfessorRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ProfessorGroupsViewModel(
    @Suppress("unused") private val repository: MobileProfessorRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<String>>(UiState.Empty)
    val uiState: StateFlow<UiState<String>> = _uiState

    fun load() {
        _uiState.value = UiState.Empty
    }
}

@Composable
fun ProfessorGroupsScreen(state: UiState<String>, onRetry: () -> Unit) {
    PlaceholderFeatureScreen(
        title = "Grupos",
        body = state.messageOr("Todavia no hay grupos para mostrar en la app."),
        onRetry = onRetry
    )
}
