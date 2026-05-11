package com.hualas.mobile.core.ui

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data object Empty : UiState<Nothing>
    data class Content<T>(
        val value: T,
        val isRefreshing: Boolean = false
    ) : UiState<T>
    data class Error(
        val message: String,
        val retryable: Boolean = true
    ) : UiState<Nothing>
}
