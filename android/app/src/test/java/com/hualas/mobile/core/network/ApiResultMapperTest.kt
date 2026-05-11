package com.hualas.mobile.core.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response
import java.io.IOException

class ApiResultMapperTest {
    @Test
    fun mapsSuccessfulResponseWithBody() {
        val result = Response.success("ok").toApiResult()

        assertEquals(ApiResult.Success("ok"), result)
    }

    @Test
    fun mapsValidationErrorsWithBackendMessage() {
        val result = errorResponse(422, """{"error":"El email es obligatorio"}""").toApiResult<String>()

        assertEquals(ApiResult.ValidationError("El email es obligatorio"), result)
    }

    @Test
    fun mapsAuthorizationStatusCodes() {
        assertEquals(ApiResult.Unauthorized, errorResponse(401).toApiResult<String>())
        assertEquals(ApiResult.Forbidden, errorResponse(403).toApiResult<String>())
        assertEquals(ApiResult.NotFound, errorResponse(404).toApiResult<String>())
    }

    @Test
    fun mapsNetworkFailureAsRetryable() {
        val result: ApiResult<Nothing> = IOException("timeout").toApiResult()

        assertTrue(result is ApiResult.NetworkFailure)
        assertEquals("timeout", (result as ApiResult.NetworkFailure).message)
    }

    private fun errorResponse(
        code: Int,
        json: String = """{"error":"No se pudo completar la solicitud"}"""
    ): Response<String> {
        val body = json.toResponseBody("application/json".toMediaType())
        return Response.error(code, body)
    }
}
