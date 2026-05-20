package com.hualas.mobile.features.chat.data

import com.hualas.mobile.core.network.ApiResult

class MobileChatRepository(
    private val service: MobileChatService
) {
    suspend fun getConversations(): ApiResult<MobileConversationsResponseDto> = runCatching {
        service.getConversations()
    }.fold(
        onSuccess = { ApiResult.Success(it) },
        onFailure = { ApiResult.fromThrowable(it) }
    )

    suspend fun getContacts(): ApiResult<MobileChatContactsResponseDto> = runCatching {
        service.getContacts()
    }.fold(
        onSuccess = { ApiResult.Success(it) },
        onFailure = { ApiResult.fromThrowable(it) }
    )
}
