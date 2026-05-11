package com.hualas.mobile

import android.app.Application
import android.content.Context
import androidx.datastore.preferences.preferencesDataStore
import com.hualas.mobile.core.network.ApiClient
import com.hualas.mobile.core.session.AppSessionStateObserver
import com.hualas.mobile.core.session.SessionController
import com.hualas.mobile.core.session.SessionStore
import com.hualas.mobile.features.activities.data.MobileActivitiesRepository
import com.hualas.mobile.features.activities.data.MobileActivitiesService
import com.hualas.mobile.features.auth.data.MobileAuthRepository
import com.hualas.mobile.features.auth.data.MobileAuthService
import com.hualas.mobile.features.home.data.MobileHomeRepository
import com.hualas.mobile.features.home.data.MobileHomeService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

private val Context.mobileSessionDataStore by preferencesDataStore(name = "mobile_session")

class HualasApplication : Application() {
    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    lateinit var sessionStore: SessionStore
        private set

    lateinit var sessionController: SessionController
        private set

    lateinit var sessionStateObserver: AppSessionStateObserver
        private set

    lateinit var apiClient: ApiClient
        private set

    lateinit var authRepository: MobileAuthRepository
        private set

    lateinit var homeRepository: MobileHomeRepository
        private set

    lateinit var activitiesRepository: MobileActivitiesRepository
        private set

    override fun onCreate() {
        super.onCreate()

        sessionStore = SessionStore(mobileSessionDataStore)
        sessionController = SessionController(sessionStore, applicationScope)
        sessionStateObserver = AppSessionStateObserver(sessionStore)
        apiClient = ApiClient(
            baseUrl = BuildConfig.API_BASE_URL,
            tokenProvider = sessionController::currentToken,
            onUnauthorized = sessionController::invalidateSession
        )
        authRepository = MobileAuthRepository(
            service = apiClient.create(MobileAuthService::class.java),
            sessionStore = sessionStore,
            tokenProvider = sessionController::currentToken
        )
        homeRepository = MobileHomeRepository(
            service = apiClient.create(MobileHomeService::class.java)
        )
        activitiesRepository = MobileActivitiesRepository(
            service = apiClient.create(MobileActivitiesService::class.java)
        )
    }
}
