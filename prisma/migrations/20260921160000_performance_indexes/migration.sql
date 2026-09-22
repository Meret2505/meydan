-- Indexes for the query shapes the mobile API actually runs.
--
-- Each one was verified missing against the query code, not guessed:
--   * game_participants had nothing serving `where userId` — its only composite
--     leads with gameId — so attendance stats (lib/stats.ts) and the games
--     feed's `participants: { some | none: { userId } }` subquery seq-scanned
--     the whole table on every game detail, profile and team screen.
--   * Postgres does not index foreign keys for you: games.organizerId,
--     games.fieldId, games.teamId and the three tournament_matches keys were
--     all unindexed while being filtered and counted on.
--   * The feed filters `status` and orders by `scheduledAt`; one composite
--     serves both, and it also covers a status-only lookup, which is why the
--     single-column games_status_idx is redundant here and dropped.
--   * notifications is ordered by createdAt DESC, a sort [userId, isRead]
--     cannot serve.
--   * field_favorites_userId_idx duplicated the leading column of the
--     (userId, fieldId) primary key — dead weight on every write.
--
-- Additive and reversible: dropping the two redundant indexes cannot change a
-- result, only a plan. Written with `prisma migrate diff` rather than by hand.

-- DropIndex
DROP INDEX "field_favorites_userId_idx";

-- DropIndex
DROP INDEX "games_status_idx";

-- CreateIndex
CREATE INDEX "game_participants_userId_attended_idx" ON "game_participants"("userId", "attended");

-- CreateIndex
CREATE INDEX "games_status_scheduledAt_idx" ON "games"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "games_organizerId_idx" ON "games"("organizerId");

-- CreateIndex
CREATE INDEX "games_fieldId_idx" ON "games"("fieldId");

-- CreateIndex
CREATE INDEX "games_teamId_idx" ON "games"("teamId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE INDEX "tournament_matches_tournamentId_idx" ON "tournament_matches"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_matches_homeTeamId_idx" ON "tournament_matches"("homeTeamId");

-- CreateIndex
CREATE INDEX "tournament_matches_awayTeamId_idx" ON "tournament_matches"("awayTeamId");
