package com.meydan.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.meydan.app.core.common.ApiResult
import com.meydan.app.core.di.AppContainer
import com.meydan.app.feature.auth.LoginScreen
import com.meydan.app.feature.auth.LoginViewModel
import com.meydan.app.feature.auth.PhoneLoginScreen
import com.meydan.app.feature.gamedetail.GameDetailScreen
import com.meydan.app.feature.main.MainScaffold
import com.meydan.app.feature.onboarding.OnboardingFlow

/** Route names, referenced from navigation calls only. */
object Routes {
    const val LOGIN = "login"
    const val LOGIN_PHONE = "login/phone"
    const val ONBOARDING = "onboarding"
    const val HOME = "home"
    const val GAME_DETAIL = "game/{gameId}"
    fun gameDetail(id: String) = "game/$id"
}

/**
 * Root of the UI: decides the start destination from local state (no network,
 * so cold start works offline), then hosts the nav graph.
 *
 * Routing mirrors the web's proxy: no session -> login; session but
 * onboarding incomplete -> onboarding; otherwise home.
 */
@Composable
fun MeydanApp(container: AppContainer) {
    val navController = rememberNavController()

    // The authenticator emits when a refresh finally fails; wherever the user
    // is, wipe the dead session's local data and return to login with a clean
    // back stack. (The authenticator already cleared the tokens themselves.)
    LaunchedEffect(container) {
        container.sessionExpired.collect {
            container.authRepository.clearLocalSession()
            navController.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    var startDestination by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(container) {
        val repo = container.authRepository
        val start = when {
            !repo.hasSession() -> Routes.LOGIN
            repo.cachedUser()?.onboardingComplete != true -> Routes.ONBOARDING
            else -> Routes.HOME
        }
        startDestination = start

        // The cache can lag the server (e.g. onboarding finished or reset on
        // another install). Refresh /me in the background — it also updates the
        // cache — and correct the route if the completion flag disagrees.
        if (start != Routes.LOGIN) {
            val me = (repo.getMe() as? ApiResult.Success)?.data
            if (me != null && !me.user.onboardingComplete && start == Routes.HOME) {
                navController.navigate(Routes.ONBOARDING) { popUpTo(0) { inclusive = true } }
            }
        }
    }

    // A frame of plain background while DataStore answers — the visible splash
    // is the launcher's. Without this gate the NavHost would flash the login
    // screen for signed-in users on every cold start.
    val start = startDestination
    if (start == null) {
        Box(Modifier.fillMaxSize())
        return
    }

    NavHost(navController = navController, startDestination = start) {
        composable(Routes.LOGIN) {
            val viewModel = it.sharedLoginViewModel(navController, container)
            LoginNavigationEffect(viewModel, navController)
            LoginScreen(
                viewModel = viewModel,
                onPhoneClick = { navController.navigate(Routes.LOGIN_PHONE) },
            )
        }
        composable(Routes.LOGIN_PHONE) {
            val viewModel = it.sharedLoginViewModel(navController, container)
            LoginNavigationEffect(viewModel, navController)
            PhoneLoginScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.ONBOARDING) {
            OnboardingFlow(
                container = container,
                onFinished = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.HOME) {
            MainScaffold(
                container = container,
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onGameClick = { gameId -> navController.navigate(Routes.gameDetail(gameId)) },
            )
        }
        composable(Routes.GAME_DETAIL) { entry ->
            val gameId = entry.arguments?.getString("gameId").orEmpty()
            GameDetailScreen(
                container = container,
                gameId = gameId,
                onBack = { navController.popBackStack() },
            )
        }
    }
}

/**
 * Both login routes share one ViewModel scoped to the LOGIN back-stack entry,
 * so the phone form and the landing screen see the same loading/error state —
 * like the web keeps auth state in one server action.
 */
@Composable
private fun androidx.navigation.NavBackStackEntry.sharedLoginViewModel(
    navController: androidx.navigation.NavHostController,
    container: AppContainer,
): LoginViewModel {
    val parentEntry = remember(this) { navController.getBackStackEntry(Routes.LOGIN) }
    return viewModel(parentEntry) { LoginViewModel(container.authRepository) }
}

/** Sends a successful sign-in to onboarding or home and clears the stack. */
@Composable
private fun LoginNavigationEffect(
    viewModel: LoginViewModel,
    navController: androidx.navigation.NavHostController,
) {
    LaunchedEffect(viewModel) {
        viewModel.navigateTo.collect { dest ->
            if (dest == null) return@collect
            viewModel.consumeNavigation()
            val route = when (dest) {
                LoginViewModel.Destination.Onboarding -> Routes.ONBOARDING
                LoginViewModel.Destination.Home -> Routes.HOME
            }
            navController.navigate(route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}
