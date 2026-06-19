import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";

export default async function OnboardingLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  return <div className="min-h-dvh flex flex-col">{children}</div>;
}
