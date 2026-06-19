import { redirect } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });
  if (!user?.phone) redirect(`/${locale}/onboarding/name`);
  redirect(`/${locale}/games`);
}
