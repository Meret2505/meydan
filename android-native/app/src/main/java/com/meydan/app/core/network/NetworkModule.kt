package com.meydan.app.core.network

import com.meydan.app.BuildConfig
import com.meydan.app.core.datastore.TokenStore
import java.io.File
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Cache
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
    cacheDir: File,
) {
    private val json = Json {
        ignoreUnknownKeys = true // tolerate fields the client does not model yet
        explicitNulls = false
    }

    private val converterFactory =
        json.asConverterFactory("application/json".toMediaType())

    private val baseUrl = BuildConfig.API_BASE_URL

    /**
     * OkHttp's 10s defaults are too aggressive for the target market's mobile
     * networks: a slow-but-succeeding request reads as "offline" and the UI
     * shows a connection error over a response that was actually coming. These
     * looser timeouts let a genuinely slow request finish while still bounding
     * a truly dead connection.
     */
    private fun OkHttpClient.Builder.withTimeouts() = apply {
        connectTimeout(20, TimeUnit.SECONDS)
        readTimeout(30, TimeUnit.SECONDS)
        writeTimeout(20, TimeUnit.SECONDS)
    }

    /**
     * Shared HTTP cache. Without one OkHttp cannot make a conditional request
     * at all, so every list refresh pays for a full body even when nothing
     * changed and the server offers a validator. 10 MB is far more than the
     * whole API surface needs; the images have Coil's own disk cache.
     */
    private val httpCache = Cache(File(cacheDir, "http"), 10L * 1024 * 1024)

    // Bare client for refresh — no interceptor, no authenticator, so a failed
    // refresh cannot recurse.
    private val authClient = OkHttpClient.Builder().withTimeouts().build()

    private val authRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(authClient)
        .addConverterFactory(converterFactory)
        .build()

    val authApi: AuthApi = authRetrofit.create(AuthApi::class.java)

    private val apiClient = OkHttpClient.Builder()
        .withTimeouts()
        .cache(httpCache)
        .addInterceptor(AuthInterceptor(tokenStore))
        .authenticator(TokenAuthenticator(tokenStore, authApi, onRefreshFailed))
        .build()

    private val apiRetrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(apiClient)
        .addConverterFactory(converterFactory)
        .build()

    val meydanApi: MeydanApi = apiRetrofit.create(MeydanApi::class.java)

    /**
     * Client for Coil.
     *
     * Coil builds its own OkHttpClient with the stock 10 s timeouts, which
     * undoes the deliberate loosening above for exactly the connections this
     * app targets: photos were aborting while API calls on the same network
     * succeeded. No auth interceptor — storage URLs are public — and no
     * [httpCache], because Coil keeps its own disk cache of decoded bytes.
     * Shares this process's connection pool with the API client.
     */
    val imageClient: OkHttpClient = OkHttpClient.Builder()
        .withTimeouts()
        .connectionPool(apiClient.connectionPool)
        .build()
}
