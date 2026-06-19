"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function markAllRead(locale: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath(`/${locale}/notifications`);
  revalidatePath(`/${locale}/games`);
}
