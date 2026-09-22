package com.meydan.app.feature.gamedetail

/**
 * What the organizer is filling in on the write-up sheet.
 *
 * Immutable: every edit returns a new draft, so the sheet cannot drift from the
 * state the ViewModel holds.
 *
 * Scores are kept as text because a half-typed field is a normal intermediate
 * state; [homeScore]/[awayScore] are the parsed values, and [canSubmit] is what
 * the button reads. Attendance defaults to everyone present — confirming is far
 * more common than correcting, and an organizer who taps straight through has
 * still recorded something true most of the time.
 */
data class ResultDraft(
    val attended: Map<String, Boolean>,
    val home: String = "",
    val away: String = "",
) {
    companion object {
        private const val MAX_SCORE_DIGITS = 2

        fun forRoster(userIds: List<String>): ResultDraft =
            ResultDraft(attended = userIds.associateWith { true })
    }

    val homeScore: Int? get() = home.toIntOrNull()
    val awayScore: Int? get() = away.toIntOrNull()

    private val hasFullScore: Boolean get() = homeScore != null && awayScore != null
    private val hasPartialScore: Boolean
        get() = home.isNotEmpty() != away.isNotEmpty()

    /**
     * Attendance alone is enough; a score alone is enough; half a score is not
     * a result at all, and an empty form has nothing to write.
     */
    val canSubmit: Boolean
        get() = !hasPartialScore && (attended.isNotEmpty() || hasFullScore)

    fun toggle(userId: String): ResultDraft =
        copy(attended = attended + (userId to !(attended[userId] ?: true)))

    fun withScores(home: String, away: String): ResultDraft = copy(
        home = home.filter(Char::isDigit).take(MAX_SCORE_DIGITS),
        away = away.filter(Char::isDigit).take(MAX_SCORE_DIGITS),
    )
}
