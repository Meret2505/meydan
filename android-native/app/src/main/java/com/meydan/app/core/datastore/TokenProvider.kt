package com.meydan.app.core.datastore

/**
 * The slice of token storage the network layer needs.
 *
 * The interceptor and authenticator depend on this rather than the concrete
 * [TokenStore], so they can be unit-tested with an in-memory fake and never
 * need Android's DataStore or a Context on the test classpath.
 */
interface TokenProvider {
    suspend fun accessToken(): String?
    suspend fun refreshToken(): String?
    suspend fun save(accessToken: String, refreshToken: String)
    suspend fun clear()
}
