// Nightly housekeeping: drops rate-limit windows and refresh tokens that are
// long past their expiry. Both tables only ever grew, and both sit on the
// login path. See lib/services/maintenance.ts for why revoked refresh tokens
// are kept for a while rather than deleted immediately.
//
// Same guard as the other cron: Vercel sends CRON_SECRET as a bearer token,
// and a missing secret fails closed rather than running unauthenticated.

import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredRows } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("purge: CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const purged = await purgeExpiredRows();
    if (purged.rateLimits > 0 || purged.refreshTokens > 0) {
      console.info("purge:", purged);
    }
    return NextResponse.json({ ok: true, ...purged });
  } catch (error) {
    console.error("purge failed:", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
