// Lightweight liveness check that also touches Postgres.
//
// Its real job is to keep the Supabase project warm: the free tier pauses a
// project after ~7 days without database activity, and a paused project takes
// the whole app offline (login fails, /me/stats returns nothing). A daily
// Vercel cron (see vercel.json) hits this route, the `SELECT 1` counts as
// activity, and the inactivity timer never reaches the pause threshold.
//
// It doubles as a plain uptime endpoint — GET /api/health returns 200 with
// { ok, db } when the database answers, 503 when it does not.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cache: the point is to run a fresh query on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: true });
  } catch (error) {
    console.error("Health check DB query failed:", error);
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
