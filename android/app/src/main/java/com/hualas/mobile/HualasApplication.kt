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
import com.hualas.mobile.features.chat.data.MobileChatRepository
import com.hualas.mobile.features.chat.data.MobileChatService
import com.hualas.mobile.features.family.data.MobileFamilyRepository
import com.hualas.mobile.features.family.data.MobileFamilyService
import com.hualas.mobile.features.home.data.MobileHomeRepository
import com.hualas.mobile.features.home.data.MobileHomeService
import com.hualas.mobile.features.news.data.MobileNewsRepository
import com.hualas.mobile.features.news.data.MobileNewsService
import com.hualas.mobile.features.notifications.data.MobileNotificationsRepository
import com.hualas.mobile.features.notifications.data.MobileNotificationsService
import com.hualas.mobile.features.payments.data.MobilePaymentsRepository
import com.hualas.mobile.features.payments.data.MobilePaymentsService
import com.hualas.mobile.features.professor.data.MobileProfessorRepository
import com.hualas.mobile.features.professor.data.MobileProfessorService
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

    lateinit var familyRepository: MobileFamilyRepository
        private set

    lateinit var paymentsRepository: MobilePaymentsRepository
        private set

    lateinit var newsRepository: MobileNewsRepository
        private set

    lateinit var chatRepository: MobileChatRepository
        private set

    lateinit var notificationsRepository: MobileNotificationsRepository
        private set

    lateinit var professorRepository: MobileProfessorRepository
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
        familyRepository = MobileFamilyRepository(
            service = apiClient.create(MobileFamilyService::class.java)
        )
        paymentsRepository = MobilePaymentsRepository(
            service = apiClient.create(MobilePaymentsService::class.java)
        )
        newsRepository = MobileNewsRepository(
            service = apiClient.create(MobileNewsService::class.java)
        )
        chatRepository = MobileChatRepository(
            service = apiClient.create(MobileChatService::class.java)
        )
        notificationsRepository = MobileNotificationsRepository(
            service = apiClient.create(MobileNotificationsService::class.java)
        )
        professorRepository = MobileProfessorRepository(
            service = apiClient.create(MobileProfessorService::class.java)
        )
    }
}
