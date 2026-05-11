package com.hualas.mobile.core.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class UiStateTest {
    @Test
    fun contentCanRepresentPullToRefresh() {
        val state = UiState.Content(
            value = listOf("Actividad"),
            isRefreshing = true
        )

        assertEquals(true, state.isRefreshing)
        assertEquals(listOf("Actividad"), state.value)
    }
}
