import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { BottomNav } from "@/components/layout/BottomNav";
import { FcmRegister } from "@/components/FcmRegister";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  // onboardingComplete is resolved by the auth callbacks (cached in the JWT),
  // so this guard no longer costs a per-navigation DB round-trip.
  if (!session.user.onboardingComplete) redirect(`/${locale}/onboarding/name`);

  return (
    <div className="min-h-dvh pb-20">
      {children}
      <BottomNav />
      <FcmRegister />
    </div>
  );
}
