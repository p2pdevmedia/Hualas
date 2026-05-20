package com.hualas.mobile.features.chat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ChatListScreen(
    state: ChatListUiState,
    onRetry: () -> Unit,
    onSearchChange: (String) -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(ChatTab.RECENT) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Chat", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Buscar chats y contactos") }
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = selectedTab == ChatTab.RECENT,
                onClick = { selectedTab = ChatTab.RECENT },
                label = { Text("Recientes") }
            )
            FilterChip(
                selected = selectedTab == ChatTab.CONTACTS,
                onClick = { selectedTab = ChatTab.CONTACTS },
                label = { Text("Contactos") }
            )
        }

        val query = state.searchQuery.trim().lowercase()
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (selectedTab) {
                ChatTab.RECENT -> {
                    val rows = state.conversations.filter {
                        query.isBlank() || it.title.lowercase().contains(query) || it.lastMessage.lowercase().contains(query)
                    }
                    items(rows) { row ->
                        Text("${row.title} · ${row.lastMessage}", style = MaterialTheme.typography.bodyLarge)
                    }
                }

                ChatTab.CONTACTS -> {
                    val rows = state.contacts.filter {
                        query.isBlank() || it.name.lowercase().contains(query)
                    }
                    items(rows) { row ->
                        Text("${row.name} · ${row.subtitle}", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }

        if (state.error != null) {
            Text(state.error, color = MaterialTheme.colorScheme.error)
        }
    }
}

private enum class ChatTab { RECENT, CONTACTS }
