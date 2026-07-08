import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // Route Handlers don't get Next's built-in server-action origin check, so
  // guard against cross-site POSTs explicitly: a browser always sends Origin on
  // POST, and it must match the request host. (Native/no-Origin callers are
  // still gated by the authenticated session below.)
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!originHost || originHost !== host) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token || token.length > 4096)
    return new NextResponse("bad request", { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { fcmToken: token },
  });
  return NextResponse.json({ ok: true });
}
