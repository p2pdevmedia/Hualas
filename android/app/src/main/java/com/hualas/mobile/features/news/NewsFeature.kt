package com.hualas.mobile.features.news

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.family.PlaceholderFeatureScreen
import com.hualas.mobile.features.news.data.MobileNewsItem
import com.hualas.mobile.features.news.data.MobileNewsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NewsViewModel(
    private val repository: MobileNewsRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<List<MobileNewsItem>>>(UiState.Empty)
    val uiState: StateFlow<UiState<List<MobileNewsItem>>> = _uiState

    fun load() {
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            _uiState.value = when (val result = repository.loadNews()) {
                is ApiResult.Success -> if (result.value.isEmpty()) UiState.Empty else UiState.Content(result.value)
                is ApiResult.ValidationError -> UiState.Error(result.message)
                ApiResult.Unauthorized -> UiState.Error("Tu sesion vencio. Volve a ingresar.", retryable = false)
                ApiResult.Forbidden -> UiState.Error("No tenes permiso para ver novedades.", retryable = false)
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
fun NewsScreen(state: UiState<List<MobileNewsItem>>, onRetry: () -> Unit, onMarkRead: (String) -> Unit) {
    when (state) {
        UiState.Loading -> PlaceholderFeatureScreen("Noticias", "Cargando noticias...", onRetry)
        UiState.Empty -> PlaceholderFeatureScreen("Noticias", "Todavia no hay novedades para mostrar en la app.", onRetry)
        is UiState.Error -> PlaceholderFeatureScreen("Noticias", state.message, onRetry)
        is UiState.Content -> Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Noticias", style = MaterialTheme.typography.titleMedium)
            state.value.forEach { item ->
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
                                text = item.title,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f)
                            )
                            if (!item.isRead) {
                                TextButton(onClick = { onMarkRead(item.id) }) {
                                    Text("Leida")
                                }
                            }
                        }
                        item.activityName?.let {
                            Text(it, style = MaterialTheme.typography.labelMedium)
                        }
                        Text(
                            text = item.body,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = listOf(item.author, item.createdAt).joinToString(" - "),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
