package com.meydan.app.core.common

import java.util.UUID

/**
 * The `Idempotency-Key` for one submit.
 *
 * On a mobile link a response is lost far more often than a request: the game
 * is created, the reply never arrives, and the person taps Submit again on a
 * screen that still looks unsent. The server can only recognise that as the
 * same request if the client repeats the key — so the key is minted once per
 * submit and reused by every retry of it. A *different* submit gets a
 * different key, or two teams someone really meant to create would collapse
 * into one.
 *
 * Reusing a key after a failure is always safe: the server stores a response
 * only when the work succeeded, and a failed attempt releases its own claim
 * (see lib/api/idempotency.ts). So the retry either replays a success the
 * client never saw, or runs for real.
 *
 * Owned by a ViewModel, which is scoped to the form's back-stack entry — the
 * same lifetime as the submit it belongs to.
 */
class SubmitKey(private val mint: () -> String = { UUID.randomUUID().toString() }) {

    private var current: String? = null

    /** The key for this submit: the same value on every call until [spent]. */
    fun forAttempt(): String = current ?: mint().also { current = it }

    /** The submit landed. Whatever is asked next is a new request. */
    fun spent() {
        current = null
    }
}
