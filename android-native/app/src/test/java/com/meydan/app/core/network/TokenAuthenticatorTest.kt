package com.meydan.app.core.network

import com.meydan.app.core.datastore.TokenProvider
import com.meydan.app.core.network.dto.ApiResponse
import com.meydan.app.core.network.dto.RefreshRequest
import com.meydan.app.core.network.dto.SessionDto
import com.meydan.app.core.network.dto.UserDto
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the token authenticator, the trickiest bit of the network
 * layer. A fake AuthApi and an in-memory TokenProvider stand in for the real
 * ones so the refresh logic is exercised without a server or a device.
 */
class TokenAuthenticatorTest {

    private fun session(access: String, refresh: String) = SessionDto(
        accessToken = access,
        refreshToken = refresh,
        expiresIn = 900,
        user = UserDto(
            id = "u1",
            name = "Test",
            skillLevel = "BEGINNER",
            isOpenToInvite = true,
            locale = "ru",
            onboardingComplete = true,
        ),
    )

    /** In-memory token storage; a mutex keeps the concurrent test race-free. */
    private class FakeStore(
        private var access: String?,
        private var refresh: String?,
    ) : TokenProvider {
        private val lock = Mutex()
        var cleared = false
            private set

        override suspend fun accessToken(): String? = lock.withLock { access }
        override suspend fun refreshToken(): String? = lock.withLock { refresh }
        override suspend fun save(accessToken: String, refreshToken: String) {
            lock.withLock { access = accessToken; refresh = refreshToken }
        }
        override suspend fun clear() {
            lock.withLock { cleared = true; access = null; refresh = null }
        }
    }

    private class FakeAuthApi(
        private val delayMs: Long = 0,
        private val result: () -> SessionDto?,
    ) : AuthApi {
        val calls = AtomicInteger(0)

        override suspend fun refresh(
            body: RefreshRequest,
        ): retrofit2.Response<ApiResponse<SessionDto>> {
            calls.incrementAndGet()
            if (delayMs > 0) delay(delayMs)
            val session = result()
                ?: return retrofit2.Response.error(
                    401,
                    """{"success":false,"error":"invalid_refresh_token"}""".toResponseBody(),
                )
            return retrofit2.Response.success(ApiResponse(success = true, data = session))
        }
    }

    private fun response401(token: String): Response {
        val request = Request.Builder()
            .url("https://meydan.test/api/v1/games")
            .header("Authorization", "Bearer $token")
            .build()
        return Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(401)
            .message("Unauthorized")
            .build()
    }

    @Test
    fun `refreshes and retries with the new token`() = runBlocking {
        val store = FakeStore(access = "old-access", refresh = "refresh-1")
        val authApi = FakeAuthApi { session("new-access", "refresh-2") }
        val authenticator = TokenAuthenticator(store, authApi) {}

        val retry = authenticator.authenticate(null, response401("old-access"))

        assertEquals("Bearer new-access", retry?.header("Authorization"))
        assertEquals("new-access", store.accessToken())
        assertEquals("refresh-2", store.refreshToken())
        assertEquals(1, authApi.calls.get())
    }

    @Test
    fun `gives up and clears when refresh is rejected`() = runBlocking {
        val store = FakeStore(access = "old-access", refresh = "refresh-1")
        val authApi = FakeAuthApi { null } // server rejects the refresh
        var failed = false
        val authenticator = TokenAuthenticator(store, authApi) { failed = true }

        val retry = authenticator.authenticate(null, response401("old-access"))

        assertNull(retry)
        assertTrue(failed)
        assertTrue(store.cleared)
    }

    @Test
    fun `gives up without a network call when there is no refresh token`() = runBlocking {
        val store = FakeStore(access = "old-access", refresh = null)
        val authApi = FakeAuthApi { session("x", "y") }
        var failed = false
        val authenticator = TokenAuthenticator(store, authApi) { failed = true }

        assertNull(authenticator.authenticate(null, response401("old-access")))
        assertTrue(failed)
        assertEquals(0, authApi.calls.get())
    }

    @Test
    fun `stops after the retried request also fails`() = runBlocking {
        // A 401 whose request already went through one refresh must not loop.
        val store = FakeStore(access = "access", refresh = "refresh")
        val authApi = FakeAuthApi { session("x", "y") }
        val authenticator = TokenAuthenticator(store, authApi) {}

        val first = response401("access")
        val second = Response.Builder()
            .request(first.request)
            .protocol(Protocol.HTTP_1_1)
            .code(401)
            .message("Unauthorized")
            .priorResponse(first)
            .build()

        assertNull(authenticator.authenticate(null, second))
        assertEquals(0, authApi.calls.get())
    }

    @Test
    fun `concurrent 401s trigger exactly one refresh`() = runBlocking {
        // The decisive test. Ten requests 401 together; only one refresh must
        // hit the network, and all ten must retry with the same new token.
        // Otherwise rotation would reject the extras and log the user out.
        val store = FakeStore(access = "old-access", refresh = "refresh-1")
        val authApi = FakeAuthApi(delayMs = 30) { session("new-access", "refresh-2") }
        val authenticator = TokenAuthenticator(store, authApi) {}

        val retries = (1..10).map {
            async(Dispatchers.IO) {
                authenticator.authenticate(null, response401("old-access"))
            }
        }.awaitAll()

        assertEquals(1, authApi.calls.get())
        assertTrue(retries.all { it?.header("Authorization") == "Bearer new-access" })
    }
}
