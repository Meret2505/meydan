import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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
