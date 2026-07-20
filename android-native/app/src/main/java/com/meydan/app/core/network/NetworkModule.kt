package com.meydan.app.core.network

import com.meydan.app.BuildConfig
import com.meydan.app.core.datastore.TokenStore
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Builds the network stack. Plain object rather than a DI framework — see
 * AppContainer for the rationale.
 *
 * Two Retrofit instances share one Json and base URL:
 *  - [authApi] is bare, used only for token refresh.
 *  - [meydanApi] carries the auth interceptor and the token authenticator.
 * The authenticator refreshes through [authApi], which is why the two must be
 * separate (see AuthApi).
 */
class NetworkModule(
    tokenStore: TokenStore,
    onRefreshFailed: () -> Unit,
) {
    private val json = Json {
        ignoreUnknownKeys = true // tolerate fields the client does not model yet
        explicitNulls = false
    }

    private val converterFactory =
        json.asConverterFactory("application/json".toMediaType())

    private val baseUrl = BuildConfig.API_BASE_URL

    // Bare client for refresh — no interceptor, no authenticator, so a failed
    // refresh cannot recurse.
    private val authClient = OkHttpClient.Builder().build()

    private val authRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(authClient)
        .addConverterFactory(converterFactory)
        .build()

    val authApi: AuthApi = authRetrofit.create(AuthApi::class.java)

    private val apiClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(tokenStore))
        .authenticator(TokenAuthenticator(tokenStore, authApi, onRefreshFailed))
        .build()

    private val apiRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(apiClient)
        .addConverterFactory(converterFactory)
        .build()

    val meydanApi: MeydanApi = apiRetrofit.create(MeydanApi::class.java)
}
