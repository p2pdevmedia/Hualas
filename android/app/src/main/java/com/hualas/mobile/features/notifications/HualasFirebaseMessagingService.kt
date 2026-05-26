package com.hualas.mobile.features.notifications

import android.os.Build
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.hualas.mobile.BuildConfig
import com.hualas.mobile.HualasApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

class HualasFirebaseMessagingService : FirebaseMessagingService() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        registerDeviceToken(token)
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun registerDeviceToken(token: String) {
        if (token.isBlank()) return

        val hualasApplication = application as? HualasApplication ?: return
        val service = hualasApplication.apiClient.create(MobileDeviceRegistrationService::class.java)

        serviceScope.launch {
            runCatching {
                service.registerDevice(
                    RegisterMobileDeviceRequest(
                        token = token,
                        platform = "Android",
                        bundleId = BuildConfig.APPLICATION_ID,
                        environment = BuildConfig.FLAVOR,
                        deviceName = Build.DEVICE,
                        deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
                        appVersion = BuildConfig.VERSION_NAME
                    )
                )
            }.onFailure { error ->
                Log.w(TAG, "No se pudo registrar el token FCM", error)
            }
        }
    }

    private companion object {
        private const val TAG = "HualasFcmService"
    }
}

private interface MobileDeviceRegistrationService {
    @POST("api/mobile/devices")
    suspend fun registerDevice(@Body request: RegisterMobileDeviceRequest): Response<RegisterMobileDeviceResponse>
}

@Serializable
private data class RegisterMobileDeviceRequest(
    val token: String,
    val platform: String,
    val bundleId: String,
    val environment: String,
    val deviceName: String?,
    val deviceModel: String?,
    val appVersion: String
)

@Serializable
private data class RegisterMobileDeviceResponse(
    val device: RegisteredMobileDevice
)

@Serializable
private data class RegisteredMobileDevice(
    val id: String,
    val token: String,
    val platform: String
)
