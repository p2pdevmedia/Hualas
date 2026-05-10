package com.hualas.mobile.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.hualas.mobile.features.auth.LoginScreen
import com.hualas.mobile.features.home.HomeScreen

@Composable
fun HualasNavGraph() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = AppRoute.Login.path
    ) {
        composable(AppRoute.Login.path) {
            LoginScreen(
                onContinueAsMember = {
                    navController.navigate(AppRoute.Home.path) {
                        popUpTo(AppRoute.Login.path) { inclusive = true }
                    }
                }
            )
        }
        composable(AppRoute.Home.path) {
            HomeScreen()
        }
    }
}
