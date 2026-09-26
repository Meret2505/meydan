package com.meydan.app.core.network

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Tells the server what this build can draw.
 *
 * A team match travels down the same pipes as an ordinary game, and a build
 * that has never heard of one renders it as exactly that — "0/0 players" and
 * a Join button that answers 409. So the server withholds what the client
 * cannot handle, and this header is how it knows.
 *
 * Added before the token check in AuthInterceptor's chain rather than inside
 * it: the level is a property of the build, not of being signed in.
 *
 * The number is a floor. Each level includes everything below it, so the
 * server's check stays a comparison instead of a growing list.
 */
class FeatureInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response =
        chain.proceed(
            chain.request().newBuilder()
                .header(HEADER, LEVEL.toString())
                .build(),
        )

    private companion object {
        const val HEADER = "X-Meydan-Features"

        /** 1: team matches — a game with two teams and no individual joining. */
        const val LEVEL = 1
    }
}
