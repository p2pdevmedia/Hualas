package com.hualas.mobile.features.chat.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MobileConversationsResponseDto(
    val conversations: List<MobileConversationDto> = emptyList()
)

@Serializable
data class MobileConversationDto(
    val id: String,
    val title: String? = null,
    val subtitle: String? = null,
    val unreadCount: Int = 0,
    val peer: MobileChatPeerDto? = null,
    val lastMessage: MobileChatMessageDto? = null
)

@Serializable
data class MobileChatPeerDto(
    val id: String,
    val name: String? = null,
    val lastName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String? = null,
    val profilePhoto: String? = null,
    val label: String? = null
)

@Serializable
data class MobileChatMessageDto(
    val id: String,
    @SerialName("from") val senderId: String,
    val content: String,
    val createdAt: String,
    val readAt: String? = null
)

@Serializable
data class MobileChatContactsResponseDto(
    val familyContacts: List<MobileChatPeerDto> = emptyList(),
    val professorContacts: List<MobileChatPeerDto> = emptyList(),
    val staffContacts: List<MobileChatPeerDto> = emptyList()
)

@Serializable
data class MobileThreadResponseDto(
    val conversationId: String? = null,
    val peer: MobileChatPeerDto? = null,
    val messages: List<MobileChatMessageDto> = emptyList()
)

@Serializable
data class MobileSendMessageDto(
    val content: String
)

@Serializable
data class MobileSendMessageResponseDto(
    val message: MobileChatMessageDto? = null
)
