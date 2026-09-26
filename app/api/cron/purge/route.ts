// Nightly housekeeping: drops rate-limit windows and refresh tokens that are
// long past their expiry. Both tables only ever grew, and both sit on the
// login path. See lib/services/maintenance.ts for why revoked refresh tokens
// are kept for a while rather than deleted immediately.
//
// Same guard as the other cron: Vercel sends CRON_SECRET as a bearer token,
// and a missing secret fails closed rather than running unauthenticated.

import { NextRequest, NextResponse } from "next/server";
import { cronUnauthorized } from "@/lib/api/cron-auth";
import { purgeExpiredRows } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = cronUnauthorized(request, "purge");
  if (denied) return denied;

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
