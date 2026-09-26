import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as scoreRoute } from "@/app/api/v1/games/[id]/score/route";
import { POST as confirmRoute } from "@/app/api/v1/games/[id]/score/confirm/route";
import { POST as rejectRoute } from "@/app/api/v1/games/[id]/score/reject/route";
import { signAccessToken } from "@/lib/api/tokens";
import { fetchTeamDetail } from "@/lib/services/team-detail-queries";
import { sweepMatches } from "@/lib/services/match-lifecycle";
import { SCORE_CONFIRM_WINDOW_MS } from "@/lib/services/match-state";

const prisma = new PrismaClient();

const dbAvailable = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!dbAvailable) {
  console.warn("[match-result-api] no test database reachable — skipping integration tests");
}

const BASE = "https://meydan.test/api/v1";

async function authed(url: string, userId: string, init: RequestInit = {}) {
  const token = await signAccessToken({ userId, onboardingComplete: true });
  return new Request(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (r: Response) => r.json() as Promise<any>;

/**
 * Writing up a match, and the handshake that makes the score count.
 *
 * The rule under test is that one team cannot write the other team's record.
 * Everything else — who may answer, what silence means, what a rejection
 * does — follows from that.
 */
describe.skipIf(!dbAvailable)("match results (integration)", () => {
  let homeCaptain: string;
  let homePlayer: string;
  let awayCaptain: string;
  let awayPlayer: string;
  let homeTeam: string;
  let awayTeam: string;
  let matchId: string;

  async function makeTeam(name: string, prefix: string) {
    const members = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.user.create({
          data: { name: `${name} ${i}`, phone: `${prefix}${String(i).padStart(2, "0")}` },
        }),
      ),
    );
    const team = await prisma.team.create({
      data: {
        name,
        members: { create: members.map((m, i) => ({ userId: m.id, isCaptain: i === 0 })) },
      },
    });
    return { teamId: team.id, ids: members.map((m) => m.id) };
  }

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.user.deleteMany();

    const home = await makeTeam("Ýyldyz", "+9936530");
    const away = await makeTeam("Aşgabat", "+9936531");
    homeTeam = home.teamId;
    [homeCaptain, homePlayer] = home.ids;
    awayTeam = away.teamId;
    [awayCaptain, awayPlayer] = away.ids;

    // A match that has been played: agreed, kickoff behind us, closed out.
    const match = await prisma.game.create({
      data: {
        type: "TEAM_MATCH",
        organizerId: homeCaptain,
        teamId: homeTeam,
        awayTeamId: awayTeam,
        agreedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        status: "COMPLETED",
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        totalSpots: 10,
        fieldName: "Meydan Arena",
        participants: {
          create: [
            ...home.ids.map((userId) => ({ userId, teamId: home.teamId })),
            ...away.ids.map((userId) => ({ userId, teamId: away.teamId })),
          ],
        },
      },
    });
    matchId = match.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.gameParticipant.deleteMany();
    await prisma.game.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  async function reportScore(userId: string, home: number, away: number, attended?: Record<string, boolean>) {
    return scoreRoute(
      await authed(`${BASE}/games/${matchId}/score`, userId, {
        method: "POST",
        body: JSON.stringify({ scoreHome: home, scoreAway: away, attended }),
      }),
      ctx(matchId),
    );
  }

  const confirm = async (userId: string) =>
    confirmRoute(
      await authed(`${BASE}/games/${matchId}/score/confirm`, userId, { method: "POST" }),
      ctx(matchId),
    );

  const reject = async (userId: string) =>
    rejectRoute(
      await authed(`${BASE}/games/${matchId}/score/reject`, userId, { method: "POST" }),
      ctx(matchId),
    );

  it("a captain enters the score and the other is asked to answer", async () => {
    const response = await reportScore(homeCaptain, 3, 1);
    expect(response.status).toBe(200);

    const match = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.scoreHome).toBe(3);
    expect(match.scoreReportedByTeamId).toBe(homeTeam);
    expect(match.scoreConfirmedAt).toBeNull();

    const asked = await prisma.notification.findMany({ where: { type: "MATCH_RESULT_REPORTED" } });
    expect(asked.map((n) => n.userId)).toEqual([awayCaptain]);
  });

  it("an unanswered score does not count toward either record yet", async () => {
    await reportScore(homeCaptain, 3, 1);

    const detail = await fetchTeamDetail(homeTeam);
    expect(detail?.wins).toBe(0);
    expect(detail?.points).toBe(0);
  });

  it("counts for both teams, from each end of the pitch, once confirmed", async () => {
    // The whole payoff: these numbers have read 0-0-0 for the life of the app.
    await reportScore(homeCaptain, 3, 1);
    expect((await confirm(awayCaptain)).status).toBe(200);

    const home = await fetchTeamDetail(homeTeam);
    const away = await fetchTeamDetail(awayTeam);

    expect(home?.wins).toBe(1);
    expect(home?.losses).toBe(0);
    expect(home?.points).toBe(3);
    expect(away?.wins).toBe(0);
    expect(away?.losses).toBe(1);
    expect(away?.points).toBe(0);
  });

  it("a draw is a point each", async () => {
    await reportScore(homeCaptain, 2, 2);
    await confirm(awayCaptain);

    expect((await fetchTeamDetail(homeTeam))?.points).toBe(1);
    expect((await fetchTeamDetail(awayTeam))?.points).toBe(1);
  });

  it("the captain who entered the score cannot confirm it", async () => {
    // Otherwise confirmation means nothing at all.
    await reportScore(homeCaptain, 3, 1);

    const response = await confirm(homeCaptain);

    expect(response.status).toBe(403);
    expect((await body(response)).error).toBe("cannot_answer_own_report");
  });

  it("a player who is not a captain cannot answer", async () => {
    await reportScore(homeCaptain, 3, 1);
    expect((await confirm(awayPlayer)).status).toBe(403);
  });

  it("rejecting puts the match back to having no score", async () => {
    // Without this the only way to disagree is silence — and silence agrees.
    await reportScore(homeCaptain, 9, 0);
    expect((await reject(awayCaptain)).status).toBe(200);

    const match = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.scoreHome).toBeNull();
    expect(match.scoreReportedAt).toBeNull();
    expect((await fetchTeamDetail(homeTeam))?.wins).toBe(0);

    // And the other captain can now enter the real one.
    expect((await reportScore(awayCaptain, 0, 2)).status).toBe(200);
    expect((await confirm(homeCaptain)).status).toBe(200);
    expect((await fetchTeamDetail(awayTeam))?.wins).toBe(1);
  });

  it("a confirmed score cannot be rewritten", async () => {
    await reportScore(homeCaptain, 3, 1);
    await confirm(awayCaptain);

    const again = await reportScore(awayCaptain, 0, 9);

    expect(again.status).toBe(409);
    const match = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.scoreHome).toBe(3);
  });

  it("a corrected score restarts the three days", async () => {
    await reportScore(homeCaptain, 3, 1);
    const first = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });

    await reportScore(homeCaptain, 2, 1);
    const second = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });

    expect(second.scoreHome).toBe(2);
    expect(second.scoreReportedAt!.getTime()).toBeGreaterThanOrEqual(
      first.scoreReportedAt!.getTime(),
    );
  });

  it("a captain ticks only their own side", async () => {
    // Otherwise one team writes the other team's reliability ratings.
    await reportScore(homeCaptain, 3, 1, {
      [homePlayer]: false,
      [awayPlayer]: false,
    });

    const rows = await prisma.gameParticipant.findMany({ where: { gameId: matchId } });
    expect(rows.find((r) => r.userId === homePlayer)?.attended).toBe(false);
    expect(rows.find((r) => r.userId === awayPlayer)?.attended).toBeNull();
  });

  it("silence counts the score after three days, and says so", async () => {
    await reportScore(homeCaptain, 3, 1);
    await prisma.game.update({
      where: { id: matchId },
      data: { scoreReportedAt: new Date(Date.now() - SCORE_CONFIRM_WINDOW_MS - 1000) },
    });

    // Correct before the sweep runs at all — the statistics do not depend on
    // the nightly job, only the notification does.
    expect((await fetchTeamDetail(homeTeam))?.wins).toBe(1);

    const swept = await sweepMatches();
    expect(swept.confirmed).toBe(1);

    const match = await prisma.game.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.scoreConfirmedAt).not.toBeNull();
    // Nobody confirmed it; that is what the null says.
    expect(match.scoreConfirmedById).toBeNull();

    const told = await prisma.notification.findMany({ where: { type: "MATCH_RESULT_CONFIRMED" } });
    expect(told.map((n) => n.userId)).toEqual([homeCaptain]);
  });

  it("a challenge nobody answered before kickoff is declined by the sweep", async () => {
    // Only the challenged captain can answer one; a captain who stopped
    // opening the app would otherwise leave it pending for ever.
    const stale = await prisma.game.create({
      data: {
        type: "TEAM_MATCH",
        organizerId: homeCaptain,
        teamId: homeTeam,
        awayTeamId: awayTeam,
        scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
        totalSpots: 10,
        fieldName: "Meydan Arena",
      },
    });

    const swept = await sweepMatches();
    expect(swept.declined).toBe(1);

    const after = await prisma.game.findUniqueOrThrow({ where: { id: stale.id } });
    expect(after.declinedAt).not.toBeNull();
    expect(after.status).toBe("CANCELLED");
  });

  it("the sweep is safe to run twice", async () => {
    await reportScore(homeCaptain, 3, 1);
    await prisma.game.update({
      where: { id: matchId },
      data: { scoreReportedAt: new Date(Date.now() - SCORE_CONFIRM_WINDOW_MS - 1000) },
    });

    expect((await sweepMatches()).confirmed).toBe(1);
    expect((await sweepMatches()).confirmed).toBe(0);
  });
});
