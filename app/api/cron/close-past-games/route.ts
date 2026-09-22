// Hourly job that closes out games that have been played.
//
// Without it a game sits in OPEN forever once kickoff passes: invisible in
// every feed (they ask for `scheduledAt >= now`), absent from anyone's
// history, and still joinable as far as the API's own guards were concerned.
// See lib/services/game-lifecycle.ts for the reasoning behind the grace window.
//
// Scheduled from vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`
// when that variable is set on the project, which is the only thing separating
// this from an endpoint anyone can POKE to rewrite game state — so a missing
// secret fails closed rather than running unauthenticated.

import { NextRequest, NextResponse } from "next/server";
import { closePastGames } from "@/lib/services/game-lifecycle";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("close-past-games: CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { closed, gameIds } = await closePastGames();
    // Logged because this is the only trace a scheduled run leaves; a sudden
    // large batch is worth noticing.
    if (closed > 0) console.info(`close-past-games: closed ${closed}`, gameIds);
    return NextResponse.json({ ok: true, closed });
  } catch (error) {
    console.error("close-past-games failed:", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
