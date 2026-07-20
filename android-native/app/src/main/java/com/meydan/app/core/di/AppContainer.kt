package com.meydan.app.core.di

import android.content.Context
import com.meydan.app.core.datastore.TokenStore
import com.meydan.app.core.datastore.UserCache
import com.meydan.app.core.network.NetworkModule
import com.meydan.app.data.AuthRepository
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
    val userCache = UserCache(appContext)

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
    )

    val authRepository = AuthRepository(
        api = networkModule.meydanApi,
        tokenStore = tokenStore,
        userCache = userCache,
    )
}
