package com.meydan.app.core.di

import android.content.Context
import com.meydan.app.core.datastore.FeedCache
import com.meydan.app.core.datastore.FieldsCache
import com.meydan.app.core.datastore.SettingsStore
import com.meydan.app.core.datastore.TeamsCache
import com.meydan.app.core.datastore.TokenStore
import com.meydan.app.core.datastore.TournamentsCache
import com.meydan.app.core.datastore.UserCache
import com.meydan.app.core.network.NetworkModule
import com.meydan.app.data.AuthRepository
import com.meydan.app.data.FieldSubmissionsRepository
import com.meydan.app.data.FieldsRepository
import com.meydan.app.data.GamesRepository
import com.meydan.app.data.NotificationsRepository
import com.meydan.app.data.TeamsRepository
import com.meydan.app.data.TournamentsRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/**
 * Manual dependency container.
 *
 * Deliberately not Hilt. For an app this size Android's own guidance endorses a
 * hand-written container, and it avoids pinning KSP + the Hilt Gradle plugin to
 * an exact Kotlin version — one fewer thing that can break a toolchain upgrade.
 * Everything is constructed once, lazily, and shared.
 */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val tokenStore = TokenStore(appContext)
    val settingsStore = SettingsStore(appContext)
    val userCache = UserCache(appContext)
    val feedCache = FeedCache(appContext)
    val fieldsCache = FieldsCache(appContext)
    val teamsCache = TeamsCache(appContext)
    val tournamentsCache = TournamentsCache(appContext)

    /**
     * Emits when the session becomes unrecoverable (refresh failed). The root
     * navigation collects this and returns to login. A SharedFlow rather than a
     * callback so it survives configuration changes and has no lifecycle of its
     * own.
     */
    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired: SharedFlow<Unit> = _sessionExpired

    private val networkModule = NetworkModule(
        tokenStore = tokenStore,
        onRefreshFailed = { _sessionExpired.tryEmit(Unit) },
        cacheDir = appContext.cacheDir,
    )

    /** Tuned OkHttp client for Coil — see NetworkModule.imageClient. */
    val imageClient get() = networkModule.imageClient

    val authRepository = AuthRepository(
        api = networkModule.meydanApi,
        tokenStore = tokenStore,
        userCache = userCache,
        feedCache = feedCache,
        fieldsCache = fieldsCache,
        teamsCache = teamsCache,
        tournamentsCache = tournamentsCache,
    )

    val gamesRepository = GamesRepository(
        api = networkModule.meydanApi,
        feedCache = feedCache,
    )

    val fieldsRepository = FieldsRepository(
        api = networkModule.meydanApi,
        fieldsCache = fieldsCache,
    )

    val teamsRepository = TeamsRepository(
        api = networkModule.meydanApi,
        teamsCache = teamsCache,
    )

    val tournamentsRepository = TournamentsRepository(
        api = networkModule.meydanApi,
        tournamentsCache = tournamentsCache,
    )

    val notificationsRepository = NotificationsRepository(networkModule.meydanApi)

    val fieldSubmissionsRepository = FieldSubmissionsRepository(networkModule.meydanApi)
}
