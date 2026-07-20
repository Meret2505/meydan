package com.meydan.app.core.network

import com.meydan.app.core.datastore.TokenProvider
import com.meydan.app.core.network.dto.RefreshRequest
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * Refreshes the access token when the server answers 401, then retries the
 * original request once.
 *
 * Single-flight: when several requests 401 at once (common right after the
 * token expires), only the first performs the network refresh; the rest wait
 * on the mutex and then pick up the token it stored. Without this, N concurrent
 * 401s would fire N refreshes, and since refresh rotates the token, all but one
 * would be rejected as reuse — logging the user out mid-session.
 *
 * @param onRefreshFailed invoked when refresh is impossible (no token, or the
 *   server rejected it), so the app can route back to login.
 */
class TokenAuthenticator(
    private val tokenStore: TokenProvider,
    private val authApi: AuthApi,
    private val onRefreshFailed: () -> Unit,
) : Authenticator {

    private val mutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Give up rather than loop forever if even the retried request 401s.
        if (responseCount(response) >= 2) return null

        val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")

        return runBlocking {
            mutex.withLock {
                val current = tokenStore.accessToken()

                // Another thread already refreshed while we waited for the lock:
                // the stored token differs from the one our request used, so just
                // retry with the new one — no second network call.
                if (current != null && current != failedToken) {
                    return@withLock retryWith(response.request, current)
                }

                val refreshToken = tokenStore.refreshToken()
                if (refreshToken == null) {
                    onRefreshFailed()
                    return@withLock null
                }

                val result = runCatching {
                    authApi.refresh(RefreshRequest(refreshToken))
                }.getOrNull()
                val session = result?.takeIf { it.isSuccessful }?.body()?.data

                if (session == null) {
                    // Refresh token expired, revoked, or reuse-detected. The
                    // session is gone; clear it and send the user to login.
                    tokenStore.clear()
                    onRefreshFailed()
                    return@withLock null
                }

                tokenStore.save(session.accessToken, session.refreshToken)
                retryWith(response.request, session.accessToken)
            }
        }
    }

    private fun retryWith(request: Request, accessToken: String): Request =
        request.newBuilder()
            .header("Authorization", "Bearer $accessToken")
            .build()

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
