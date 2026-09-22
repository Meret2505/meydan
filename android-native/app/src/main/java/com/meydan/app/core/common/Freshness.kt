package com.meydan.app.core.common

/**
 * How long a just-loaded tab is considered fresh enough to skip a refetch.
 *
 * Short on purpose: it exists to collapse the duplicate fetch that happens
 * when a ViewModel loads in `init` and its screen also loads from an
 * enter/resume effect, not to stop the app from ever refreshing. Anything
 * longer starts hiding real updates.
 */
const val MIN_REFRESH_INTERVAL_MS = 10_000L

/**
 * Whether a tab should go to the network again.
 *
 * [lastLoadedAt] is null before the first load, and a wall-clock timestamp
 * afterwards. A clock that moved backwards reads as stale — a wasted request
 * is cheaper than a tab that can never refresh again. [force] is for
 * pull-to-refresh, which the user asked for explicitly and must always run.
 */
fun isStale(
    now: Long,
    lastLoadedAt: Long?,
    force: Boolean = false,
    minIntervalMs: Long = MIN_REFRESH_INTERVAL_MS,
): Boolean {
    if (force || lastLoadedAt == null) return true
    val elapsed = now - lastLoadedAt
    return elapsed < 0 || elapsed >= minIntervalMs
}
