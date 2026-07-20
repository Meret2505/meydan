package com.meydan.app.core.network

import com.meydan.app.core.datastore.TokenProvider
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches the current access token to every outgoing request.
 *
 * OkHttp interceptors are synchronous, while TokenStore is suspend-based, so
 * the read is bridged with runBlocking. This runs on OkHttp's background
 * dispatcher thread, never the main thread, so blocking briefly is fine.
 *
 * Requests that already carry an Authorization header (there are none today,
 * but defensively) are left untouched.
 */
class AuthInterceptor(private val tokenStore: TokenProvider) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.header("Authorization") != null) return chain.proceed(request)

        val token = runBlocking { tokenStore.accessToken() }
            ?: return chain.proceed(request)

        val authorized = request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(authorized)
    }
}
