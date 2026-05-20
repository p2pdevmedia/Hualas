package com.hualas.mobile.features.chat.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface MobileChatService {
    @GET("api/mobile/messages")
    suspend fun getConversations(): MobileConversationsResponseDto

    @GET("api/mobile/chat/contacts")
    suspend fun getContacts(): MobileChatContactsResponseDto

    @GET("api/mobile/messages/{userId}")
    suspend fun getThread(@Path("userId") userId: String): MobileThreadResponseDto

    @POST("api/mobile/messages/{userId}")
    suspend fun sendMessage(
        @Path("userId") userId: String,
        @Body payload: MobileSendMessageDto
    ): MobileSendMessageResponseDto
}
