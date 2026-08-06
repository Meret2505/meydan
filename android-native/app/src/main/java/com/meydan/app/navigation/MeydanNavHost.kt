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
import com.meydan.app.feature.creategame.CreateGameScreen
import com.meydan.app.feature.createteam.CreateTeamScreen
import com.meydan.app.feature.fielddetail.FieldDetailScreen
import com.meydan.app.feature.gamedetail.GameDetailScreen
import com.meydan.app.feature.main.MainScaffold
import com.meydan.app.feature.teamdetail.TeamDetailScreen
import com.meydan.app.feature.tournamentdetail.TournamentDetailScreen
import com.meydan.app.feature.onboarding.OnboardingFlow
import com.meydan.app.feature.profileedit.ProfileEditScreen

/** Route names, referenced from navigation calls only. */
object Routes {
    const val LOGIN = "login"
    const val LOGIN_PHONE = "login/phone"
    const val ONBOARDING = "onboarding"
    const val HOME = "home"
    const val GAME_DETAIL = "game/{gameId}"
    fun gameDetail(id: String) = "game/$id"
    const val CREATE_GAME = "create-game"
    const val PROFILE_EDIT = "profile-edit"
    const val CREATE_TEAM = "create-team"
    const val FIELD_DETAIL = "field/{fieldId}"
    fun fieldDetail(id: String) = "field/$id"
    const val TEAM_DETAIL = "team/{teamId}"
    fun teamDetail(id: String) = "team/$id"
    const val TOURNAMENT_DETAIL = "tournament/{tournamentId}"
    fun tournamentDetail(id: String) = "tournament/$id"
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
                onGameClick = { navController.navigate(Routes.gameDetail(it)) },
                onFieldClick = { navController.navigate(Routes.fieldDetail(it)) },
                onTeamClick = { navController.navigate(Routes.teamDetail(it)) },
                onTournamentClick = { navController.navigate(Routes.tournamentDetail(it)) },
                onCreateGame = { navController.navigate(Routes.CREATE_GAME) },
                onEditProfile = { navController.navigate(Routes.PROFILE_EDIT) },
                onCreateTeam = { navController.navigate(Routes.CREATE_TEAM) },
            )
        }
        composable(Routes.CREATE_TEAM) {
            CreateTeamScreen(
                container = container,
                onBack = { navController.popBackStack() },
                onCreated = { teamId ->
                    // Replace the form with the new team's detail so Back from
                    // detail returns to the teams tab, not the create form.
                    navController.navigate(Routes.teamDetail(teamId)) {
                        popUpTo(Routes.CREATE_TEAM) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.PROFILE_EDIT) {
            ProfileEditScreen(
                container = container,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() },
            )
        }
        composable(Routes.CREATE_GAME) {
            CreateGameScreen(
                container = container,
                onBack = { navController.popBackStack() },
                onCreated = { gameId ->
                    // Replace the form with the new game's detail so Back from
                    // detail returns to the feed, not the create form.
                    navController.navigate(Routes.gameDetail(gameId)) {
                        popUpTo(Routes.CREATE_GAME) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.GAME_DETAIL) { entry ->
            GameDetailScreen(
                container = container,
                gameId = entry.arguments?.getString("gameId").orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.FIELD_DETAIL) { entry ->
            FieldDetailScreen(
                container = container,
                fieldId = entry.arguments?.getString("fieldId").orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.TEAM_DETAIL) { entry ->
            TeamDetailScreen(
                container = container,
                teamId = entry.arguments?.getString("teamId").orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.TOURNAMENT_DETAIL) { entry ->
            TournamentDetailScreen(
                container = container,
                tournamentId = entry.arguments?.getString("tournamentId").orEmpty(),
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
