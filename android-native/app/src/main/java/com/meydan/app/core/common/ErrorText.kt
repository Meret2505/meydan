package com.meydan.app.core.common

import com.meydan.app.R

/**
 * Turns a server error code into a message for the user.
 *
 * This is the whole app's error mapper — the games feed, team screens,
 * moderation, uploads and onboarding all route through it — and it used to
 * live next to the login form with nine codes mapped and everything else
 * falling through to "could not sign in". The API has thirty-odd codes, so
 * tapping Join on a game that had just filled up told the user their *sign-in*
 * had failed.
 *
 * Codes are grouped by what the user can do about them, not by endpoint. The
 * fallback says nothing it cannot know.
 */
fun errorTextRes(code: String): Int = when (code) {
    // Connectivity, and the one sentinel the client invents itself.
    "network" -> R.string.error_offline_title

    // Sign-in and account.
    "wrong_password" -> R.string.error_wrong_password
    "phone_taken" -> R.string.error_phone_taken
    "unauthorized", "invalid_token", "invalid_refresh_token" -> R.string.error_session_expired

    // Input the user can correct.
    "invalid_input" -> R.string.error_invalid_input
    "game_in_past" -> R.string.error_game_in_past
    "rate_limited" -> R.string.error_rate_limited

    // The first attempt at this submit is still running on the server — the
    // response to it was lost, not the request. Tapping again shortly gets the
    // real answer, so say that rather than "something went wrong".
    "request_in_progress" -> R.string.error_request_in_progress

    // Games.
    "game_full" -> R.string.error_game_full
    "not_joinable" -> R.string.error_not_joinable
    "game_over" -> R.string.error_game_over
    "organizer_cannot_leave" -> R.string.error_organizer_cannot_leave

    // Teams and tournaments.
    "team_in_use" -> R.string.error_team_in_use
    "captain_cannot_leave" -> R.string.error_captain_cannot_leave
    "cannot_remove_self" -> R.string.error_cannot_remove_self
    "tournament_cancelled" -> R.string.error_tournament_cancelled
    "not_registered", "teams_not_registered" -> R.string.error_not_registered

    // Pitch submissions and photos.
    "too_many_pending" -> R.string.error_too_many_pending
    "too_many_photos", "gallery_full" -> R.string.error_too_many_photos
    "already_reviewed" -> R.string.error_already_reviewed
    "storage_failed" -> R.string.error_storage_failed

    // Permission, and the several ways the server says "gone".
    "forbidden", "not_organizer", "not_captain", "not_creator", "not_member" ->
        R.string.error_forbidden
    "not_found", "game_not_found", "team_not_found", "tournament_not_found",
    "field_not_found", "photo_not_found",
    -> R.string.error_not_found

    // Anything unmapped, including the server's own "internal"/"failed".
    else -> R.string.error_generic
}
