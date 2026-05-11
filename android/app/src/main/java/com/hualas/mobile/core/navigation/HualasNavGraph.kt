package com.hualas.mobile.core.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalUriHandler
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.hualas.mobile.core.session.AppSessionState
import com.hualas.mobile.core.ui.UiState
import com.hualas.mobile.features.activities.ActivitiesUiState
import com.hualas.mobile.features.activities.ActivitiesViewModel
import com.hualas.mobile.features.activities.cart.MemberCartScreen
import com.hualas.mobile.features.activities.cart.MemberCartStore
import com.hualas.mobile.features.activities.cart.MemberCartViewModel
import com.hualas.mobile.features.activities.data.AvailableActivity
import com.hualas.mobile.features.activities.purchase.ActivityPurchaseScreen
import com.hualas.mobile.features.activities.purchase.ActivityPurchaseViewModel
import com.hualas.mobile.features.chat.ChatListScreen
import com.hualas.mobile.features.chat.ChatListViewModel
import com.hualas.mobile.features.chat.data.MobileChatRepository
import com.hualas.mobile.features.auth.AuthViewModel
import com.hualas.mobile.features.auth.LoginScreen
import com.hualas.mobile.features.family.FamilyScreen
import com.hualas.mobile.features.family.FamilyViewModel
import com.hualas.mobile.features.family.data.MobileFamilyRepository
import com.hualas.mobile.features.home.HomeViewModel
import com.hualas.mobile.features.home.HomeScreen
import com.hualas.mobile.features.news.NewsScreen
import com.hualas.mobile.features.news.NewsViewModel
import com.hualas.mobile.features.news.data.MobileNewsRepository
import com.hualas.mobile.features.notifications.NotificationsScreen
import com.hualas.mobile.features.notifications.NotificationsViewModel
import com.hualas.mobile.features.notifications.data.MobileNotificationsRepository
import com.hualas.mobile.features.payments.PaymentsScreen
import com.hualas.mobile.features.payments.PaymentsViewModel
import com.hualas.mobile.features.payments.data.MobilePaymentsRepository
import com.hualas.mobile.features.professor.attendance.ProfessorAttendanceScreen
import com.hualas.mobile.features.professor.attendance.ProfessorAttendanceViewModel
import com.hualas.mobile.features.professor.data.MobileProfessorRepository
import com.hualas.mobile.features.professor.groups.ProfessorGroupsScreen
import com.hualas.mobile.features.professor.groups.ProfessorGroupsViewModel

@Composable
fun HualasApp(
    sessionState: AppSessionState,
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    activitiesViewModel: ActivitiesViewModel,
    familyRepository: MobileFamilyRepository,
    paymentsRepository: MobilePaymentsRepository,
    newsRepository: MobileNewsRepository,
    chatRepository: MobileChatRepository,
    notificationsRepository: MobileNotificationsRepository,
    professorRepository: MobileProfessorRepository
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
                activitiesViewModel = activitiesViewModel,
                familyRepository = familyRepository,
                paymentsRepository = paymentsRepository,
                newsRepository = newsRepository,
                chatRepository = chatRepository,
                notificationsRepository = notificationsRepository,
                professorRepository = professorRepository
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
    activitiesViewModel: ActivitiesViewModel,
    familyRepository: MobileFamilyRepository,
    paymentsRepository: MobilePaymentsRepository,
    newsRepository: MobileNewsRepository,
    chatRepository: MobileChatRepository,
    notificationsRepository: MobileNotificationsRepository,
    professorRepository: MobileProfessorRepository
) {
    val navController = rememberNavController()
    val authUiState by authViewModel.uiState.collectAsState()
    val homeUiState by homeViewModel.uiState.collectAsState()
    val activitiesUiState by activitiesViewModel.uiState.collectAsState()
    val memberCartStore = remember { MemberCartStore() }
    val uriHandler = LocalUriHandler.current

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
                val familyViewModel: FamilyViewModel = viewModel(factory = SimpleViewModelFactory { FamilyViewModel(familyRepository) })
                val paymentsViewModel: PaymentsViewModel = viewModel(factory = SimpleViewModelFactory { PaymentsViewModel(paymentsRepository) })
                val newsViewModel: NewsViewModel = viewModel(factory = SimpleViewModelFactory { NewsViewModel(newsRepository) })
                val chatListViewModel: ChatListViewModel = viewModel(factory = SimpleViewModelFactory { ChatListViewModel(chatRepository) })
                val notificationsViewModel: NotificationsViewModel = viewModel(factory = SimpleViewModelFactory { NotificationsViewModel(notificationsRepository) })
                val professorGroupsViewModel: ProfessorGroupsViewModel = viewModel(factory = SimpleViewModelFactory { ProfessorGroupsViewModel(professorRepository) })
                val professorAttendanceViewModel: ProfessorAttendanceViewModel = viewModel(factory = SimpleViewModelFactory { ProfessorAttendanceViewModel(professorRepository) })
                val familyState by familyViewModel.uiState.collectAsState()
                val paymentsState by paymentsViewModel.uiState.collectAsState()
                val newsState by newsViewModel.uiState.collectAsState()
                val chatState by chatListViewModel.uiState.collectAsState()
                val notificationsState by notificationsViewModel.uiState.collectAsState()
                val professorGroupsState by professorGroupsViewModel.uiState.collectAsState()
                val professorAttendanceState by professorAttendanceViewModel.uiState.collectAsState()

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
                    onOpenPurchaseDetail = { activity ->
                        navController.navigate(AppRoute.PurchaseDetail.path(activity.id))
                    },
                    onCheckoutUrlConsumed = activitiesViewModel::consumeCheckoutUrl,
                    familyContent = {
                        LaunchedEffect(Unit) { familyViewModel.load() }
                        FamilyScreen(familyState, familyViewModel::load)
                    },
                    paymentsContent = {
                        LaunchedEffect(Unit) { paymentsViewModel.load() }
                        PaymentsScreen(paymentsState, paymentsViewModel::load)
                    },
                    chatContent = {
                        LaunchedEffect(Unit) { chatListViewModel.load() }
                        ChatListScreen(chatState, chatListViewModel::load)
                    },
                    attendanceContent = {
                        LaunchedEffect(Unit) { professorAttendanceViewModel.load() }
                        ProfessorAttendanceScreen(professorAttendanceState, professorAttendanceViewModel::load)
                    },
                    groupsContent = {
                        LaunchedEffect(Unit) { professorGroupsViewModel.load() }
                        ProfessorGroupsScreen(professorGroupsState, professorGroupsViewModel::load)
                    },
                    notificationsContent = {
                        LaunchedEffect(Unit) {
                            notificationsViewModel.load()
                            newsViewModel.load()
                        }
                        NotificationsScreen(
                            state = notificationsState,
                            onRetry = notificationsViewModel::load,
                            onMarkRead = notificationsViewModel::markRead
                        )
                        NewsScreen(
                            state = newsState,
                            onRetry = newsViewModel::load,
                            onMarkRead = newsViewModel::markRead
                        )
                    }
                )
            }
        }
        composable(
            route = AppRoute.PurchaseDetail.path,
            arguments = listOf(navArgument(AppRoute.PurchaseDetail.ARG_ACTIVITY_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val session = (sessionState as? AppSessionState.Authenticated)?.session
            val home = (homeUiState as? UiState.Content)?.value
            val activityId = backStackEntry.arguments?.getString(AppRoute.PurchaseDetail.ARG_ACTIVITY_ID)
            val activity = activityId?.let { id -> activitiesUiState.findAvailableActivity(id) }
            val purchaseViewModel: ActivityPurchaseViewModel = viewModel()
            val selection by purchaseViewModel.selection.collectAsState()

            LaunchedEffect(activity?.id, home?.profile?.id, home?.children) {
                if (activity != null && home != null && session != null) {
                    purchaseViewModel.start(activity, home.profile, home.children)
                }
            }

            ActivityPurchaseScreen(
                selection = selection,
                onBack = { navController.popBackStack() },
                onSelectTarget = purchaseViewModel::selectTarget,
                onSelectGroup = purchaseViewModel::selectGroup,
                onSelectDay = purchaseViewModel::selectDay,
                onAddToCart = {
                    memberCartStore.add(it)
                    navController.navigate(AppRoute.Cart.path)
                }
            )
        }
        composable(AppRoute.Cart.path) {
            val cartViewModel: MemberCartViewModel = viewModel(
                factory = MemberCartViewModelFactory(activitiesViewModel.repository, memberCartStore)
            )
            val cartState by cartViewModel.uiState.collectAsState()

            LaunchedEffect(cartState.checkoutUrl) {
                val checkoutUrl = cartState.checkoutUrl
                if (!checkoutUrl.isNullOrBlank()) {
                    uriHandler.openUri(checkoutUrl)
                    cartViewModel.consumeCheckoutUrl()
                }
            }

            MemberCartScreen(
                state = cartState,
                onBack = { navController.popBackStack() },
                onRemoveAt = cartViewModel::removeAt,
                onLoadQuote = cartViewModel::loadQuote,
                onCheckout = cartViewModel::checkout
            )
        }
    }
}

private class MemberCartViewModelFactory(
    private val repository: com.hualas.mobile.features.activities.data.ActivitiesRepository,
    private val cartStore: MemberCartStore
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return MemberCartViewModel(repository, cartStore) as T
    }
}

private class SimpleViewModelFactory<T : ViewModel>(
    private val creator: () -> T
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM = creator() as VM
}

private fun ActivitiesUiState.findAvailableActivity(activityId: String): AvailableActivity? {
    return (available as? UiState.Content)?.value?.activities?.firstOrNull { it.id == activityId }
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
