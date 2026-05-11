package com.hualas.mobile.core.network

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthInterceptorTest {
    @Test
    fun addsBearerTokenWhenTokenExists() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(200))
            server.start()
            val client = OkHttpClient.Builder()
                .addInterceptor(AuthInterceptor { "mobile-token" })
                .build()

            client.newCall(Request.Builder().url(server.url("/api/mobile/me")).build()).execute()

            assertEquals("Bearer mobile-token", server.takeRequest().getHeader("Authorization"))
        }
    }

    @Test
    fun skipsAuthorizationHeaderWhenTokenIsMissing() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(200))
            server.start()
            val client = OkHttpClient.Builder()
                .addInterceptor(AuthInterceptor { null })
                .build()

            client.newCall(Request.Builder().url(server.url("/api/mobile/me")).build()).execute()

            assertNull(server.takeRequest().getHeader("Authorization"))
        }
    }

    @Test
    fun notifiesWhenBackendReturnsUnauthorized() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(401))
            server.start()
            var invalidated = false
            val client = OkHttpClient.Builder()
                .addInterceptor(SessionInvalidatingInterceptor { invalidated = true })
                .build()

            client.newCall(Request.Builder().url(server.url("/api/mobile/me")).build()).execute()

            assertEquals(true, invalidated)
        }
    }
}
