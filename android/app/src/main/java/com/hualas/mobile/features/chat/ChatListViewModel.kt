package com.hualas.mobile.features.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.features.chat.data.MobileChatPeerDto
import com.hualas.mobile.features.chat.data.MobileChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ChatListUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val conversations: List<ChatConversationUiModel> = emptyList(),
    val contacts: List<ChatContactUiModel> = emptyList()
)

data class ChatConversationUiModel(
    val id: String,
    val peerId: String,
    val title: String,
    val subtitle: String,
    val lastMessage: String,
    val unreadCount: Int
)

data class ChatContactUiModel(
    val id: String,
    val name: String,
    val subtitle: String
)

class ChatListViewModel(
    private val repository: MobileChatRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ChatListUiState())
    val uiState: StateFlow<ChatListUiState> = _uiState.asStateFlow()

    fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }

            val conversationsResult = repository.getConversations()
            val contactsResult = repository.getContacts()

            if (conversationsResult is ApiResult.Success && contactsResult is ApiResult.Success) {
                val contacts = buildList {
                    addAll(contactsResult.value.familyContacts.map { it.toContact("Familia") })
                    addAll(contactsResult.value.professorContacts.map { it.toContact("Profesor") })
                    addAll(contactsResult.value.staffContacts.map { it.toContact("Staff") })
                }.distinctBy { it.id }

                _uiState.update {
                    it.copy(
                        loading = false,
                        conversations = conversationsResult.value.conversations.map { dto ->
                            ChatConversationUiModel(
                                id = dto.id,
                                peerId = dto.peer?.id.orEmpty(),
                                title = dto.title ?: dto.peer?.label ?: "Chat",
                                subtitle = dto.subtitle ?: "",
                                lastMessage = dto.lastMessage?.content ?: "Sin mensajes todavía",
                                unreadCount = dto.unreadCount
                            )
                        },
                        contacts = contacts
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        loading = false,
                        error = "No pudimos cargar el chat. Probá nuevamente."
                    )
                }
            }
        }
    }

    private fun MobileChatPeerDto.toContact(type: String): ChatContactUiModel {
        val displayName = label
            ?: listOfNotNull(name?.trim(), lastName?.trim()).joinToString(" ").ifBlank { null }
            ?: email
            ?: "Contacto"
        return ChatContactUiModel(id = id, name = displayName, subtitle = type)
    }
}
