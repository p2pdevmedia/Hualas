package com.hualas.mobile.core.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.hualas.mobile.core.session.AppSessionState
import com.hualas.mobile.features.auth.AuthViewModel
import com.hualas.mobile.features.auth.LoginScreen
import com.hualas.mobile.features.activities.ActivitiesViewModel
import com.hualas.mobile.features.home.HomeViewModel
import com.hualas.mobile.features.home.HomeScreen

@Composable
fun HualasApp(
    sessionState: AppSessionState,
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    activitiesViewModel: ActivitiesViewModel
) {
    val startDestination = startRouteForSessionState(sessionState)

    if (startDestination == null) {
        LoadingShell()
    } else {
        key(startDestination) {
            HualasNavGraph(
                startDestination = startDestination,
                sessionState = sessionState,
                authViewModel = authViewModel,
                homeViewModel = homeViewModel,
                activitiesViewModel = activitiesViewModel
            )
        }
    }
}

@Composable
fun HualasNavGraph(
    startDestination: String = AppRoute.Login.path,
    sessionState: AppSessionState = AppSessionState.Unauthenticated,
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    activitiesViewModel: ActivitiesViewModel
) {
    val navController = rememberNavController()
    val authUiState by authViewModel.uiState.collectAsState()
    val homeUiState by homeViewModel.uiState.collectAsState()
    val activitiesUiState by activitiesViewModel.uiState.collectAsState()

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(AppRoute.Login.path) {
            LoginScreen(
                state = authUiState,
                onEmailChange = authViewModel::updateEmail,
                onPasswordChange = authViewModel::updatePassword,
                onLogin = authViewModel::login
            )
        }
        composable(AppRoute.Home.path) {
            val session = (sessionState as? AppSessionState.Authenticated)?.session
            if (session == null) {
                LoadingShell()
            } else {
                LaunchedEffect(session.userId, session.activeRole) {
                    homeViewModel.load()
                    activitiesViewModel.load(session.activeRole)
                }
                HomeScreen(
                    session = session,
                    homeState = homeUiState,
                    activitiesState = activitiesUiState,
                    onRetry = homeViewModel::load,
                    onRefresh = homeViewModel::refresh,
                    onLogout = authViewModel::logout,
                    onSwitchRole = authViewModel::switchRole,
                    onLoadActivities = { activitiesViewModel.load(session.activeRole) },
                    onSelectActivityDay = activitiesViewModel::selectDay,
                    onLoadActivityDayDetail = activitiesViewModel::loadDayDetail,
                    onStartActivityCheckout = activitiesViewModel::startCheckout,
                    onCheckoutUrlConsumed = activitiesViewModel::consumeCheckoutUrl
                )
            }
        }
    }
}

@Composable
private fun LoadingShell() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}
