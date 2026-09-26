import { NextRequest, NextResponse } from "next/server";

/**
 * The guard in front of every scheduled route.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set
 * on the project, and it is the only thing separating these endpoints from
 * ones anyone can poke to rewrite game state. So a *missing* secret fails
 * closed: an unconfigured deployment refuses to run the job rather than
 * running it unauthenticated.
 *
 * It was copied verbatim into each cron route. Two copies is a coincidence;
 * the third would have been a pattern nobody owns.
 */
export function cronUnauthorized(request: NextRequest, job: string): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`${job}: CRON_SECRET is not set; refusing to run`);
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
