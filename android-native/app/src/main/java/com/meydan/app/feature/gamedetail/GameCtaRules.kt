package com.meydan.app.feature.gamedetail

import androidx.annotation.StringRes
import com.meydan.app.R
import com.meydan.app.core.network.dto.GameDetailDto

/**
 * What the bottom bar of a game offers, decided apart from how it is drawn.
 *
 * `CtaButton` was five sequential `if (…) { Button(…); return }` blocks, each
 * re-specifying shape, height, spinner and colours, and none of it reachable
 * from a test. Team matches add an orthogonal axis — which side you are on,
 * times how far the match has got — and bolting that onto five ordered
 * early-returns produces a function nobody can check by reading.
 *
 * So the decision moves here, where it is a pure function of the DTO and a
 * truth table can pin it. This file ports the five existing branches
 * *verbatim*; match branches come later, on top of tests that already say
 * what the current behaviour is.
 */

enum class CtaAction {
    /** One control for both directions, as the screen has always had. */
    TOGGLE_JOIN,
    CANCEL_GAME,
    RECORD_RESULT,
}

enum class CtaTone {
    PRIMARY,
    NEUTRAL,
    DESTRUCTIVE,
}

data class CtaButtonSpec(
    @StringRes val label: Int,
    val action: CtaAction,
    val tone: CtaTone,
    val enabled: Boolean = true,
)

sealed interface GameCta {
    /** An inert chip: cancelled, completed, yours, already played. */
    data class Status(@StringRes val label: Int) : GameCta

    data class Single(val button: CtaButtonSpec) : GameCta
}

object GameCtaRules {

    /**
     * Whether the game is finished one way or the other. Computed here rather
     * than passed in so the whole decision is a function of the DTO alone.
     */
    private fun isOver(game: GameDetailDto): Boolean =
        game.status == "COMPLETED" || game.status == "CANCELLED"

    fun ctaFor(game: GameDetailDto): GameCta {
        val over = isOver(game)

        // The organizer of a game that has not happened yet gets the cancel
        // action here. The "your game" badge already sits in the header, so the
        // bottom bar is free for it rather than repeating the label.
        if (game.isOrganizer && !over && !game.isPast) {
            return GameCta.Single(
                CtaButtonSpec(R.string.games_cancel_cta, CtaAction.CANCEL_GAME, CtaTone.DESTRUCTIVE),
            )
        }

        // The organizer of a game that has been played gets the write-up
        // action. This is the only route to it in the app — the feeds drop a
        // game at kickoff, so the RESULT_NEEDED notification is what brings
        // them here. Recording is optional: a game left unwritten keeps its
        // "completed" label, and the action stays available afterwards so a
        // wrong tick can be fixed.
        if (game.isOrganizer && game.isPast && game.status != "CANCELLED") {
            return GameCta.Single(
                CtaButtonSpec(R.string.games_result_cta, CtaAction.RECORD_RESULT, CtaTone.PRIMARY),
            )
        }

        // Finished / past games have no action; show status text.
        if (game.isOrganizer || over || game.isPast) {
            return GameCta.Status(
                when {
                    game.status == "CANCELLED" -> R.string.games_cancelled_full
                    over -> R.string.games_completed
                    game.isOrganizer -> R.string.games_banner_yours
                    else -> R.string.games_is_past
                },
            )
        }

        val joined = game.joined
        val full = game.isFull && !joined
        return GameCta.Single(
            CtaButtonSpec(
                label = when {
                    full -> R.string.games_full
                    joined -> R.string.games_joined_cta
                    else -> R.string.games_join_cta
                },
                action = CtaAction.TOGGLE_JOIN,
                // Unchanged from the original: a full game keeps the primary
                // colour and is simply disabled, so it reads as the action you
                // would take if there were room.
                tone = if (joined) CtaTone.NEUTRAL else CtaTone.PRIMARY,
                enabled = !full,
            ),
        )
    }
}
