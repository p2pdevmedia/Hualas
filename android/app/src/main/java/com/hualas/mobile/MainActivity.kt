package com.hualas.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hualas.mobile.core.design.HualasTheme
import com.hualas.mobile.core.navigation.HualasApp
import com.hualas.mobile.core.session.AppSessionState
import com.hualas.mobile.features.activities.ActivitiesViewModel
import com.hualas.mobile.features.auth.AuthViewModel
import com.hualas.mobile.features.home.HomeViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val hualasApplication = application as HualasApplication
            val sessionStates = remember {
                hualasApplication.sessionStateObserver.states()
            }
            val sessionState by sessionStates.collectAsState(initial = AppSessionState.Loading)
            val authViewModel: AuthViewModel = viewModel(
                factory = AuthViewModelFactory(hualasApplication.authRepository)
            )
            val homeViewModel: HomeViewModel = viewModel(
                factory = HomeViewModelFactory(hualasApplication.homeRepository)
            )
            val activitiesViewModel: ActivitiesViewModel = viewModel(
                factory = ActivitiesViewModelFactory(hualasApplication.activitiesRepository)
            )

            LaunchedEffect((sessionState as? AppSessionState.Authenticated)?.session?.token) {
                if (sessionState is AppSessionState.Authenticated) {
                    authViewModel.restore()
                }
            }

            HualasTheme {
                HualasApp(
                    sessionState = sessionState,
                    authViewModel = authViewModel,
                    homeViewModel = homeViewModel,
                    activitiesViewModel = activitiesViewModel
                )
            }
        }
    }
}

private class AuthViewModelFactory(
    private val repository: com.hualas.mobile.features.auth.data.AuthRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return AuthViewModel(repository) as T
    }
}

private class HomeViewModelFactory(
    private val repository: com.hualas.mobile.features.home.data.HomeRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return HomeViewModel(repository) as T
    }
}

private class ActivitiesViewModelFactory(
    private val repository: com.hualas.mobile.features.activities.data.ActivitiesRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return ActivitiesViewModel(repository) as T
    }
}
