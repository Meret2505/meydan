-- Turns on the team-vs-team match that the schema has carried unused since the
-- first migration: `GameType.TEAM_MATCH` and `Game.teamId` exist and are
-- referenced by no code, which is also why every team's win/loss record reads
-- 0-0-0 today (team-detail-queries counts games linked through a column
-- nothing ever writes).
--
-- Only additive: new nullable columns, one index, two foreign keys, five enum
-- members. No existing row changes, and an ordinary game leaves every one of
-- these null.

-- The away side is ON DELETE SET NULL on purpose. A declined challenge still
-- holds the foreign key, and a restrictive one would leave a team permanently
-- undisbandable because of a match that never happened. The home side stays
-- restrictive: it is part of the historical record of a played match.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_CHALLENGE';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_RESULT_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_RESULT_CONFIRMED';

-- AlterTable
ALTER TABLE "game_participants" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "agreedAt" TIMESTAMP(3),
ADD COLUMN     "awayTeamId" TEXT,
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "scoreConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "scoreConfirmedById" TEXT,
ADD COLUMN     "scoreReportedAt" TIMESTAMP(3),
ADD COLUMN     "scoreReportedByTeamId" TEXT;

-- CreateIndex
CREATE INDEX "games_awayTeamId_idx" ON "games"("awayTeamId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
