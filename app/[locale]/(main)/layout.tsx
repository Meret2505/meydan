import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BottomNav } from "@/components/layout/BottomNav";
import { FcmRegister } from "@/components/FcmRegister";

export default async function MainLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  setRequestLocale(locale);
  const session = await getSession();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  // onboardingComplete is resolved by the auth callbacks (cached in the JWT),
  // so this guard no longer costs a per-navigation DB round-trip.
  if (!session.user.onboardingComplete) redirect(`/${locale}/onboarding/name`);

  return (
    <div
      className="min-h-dvh"
      style={{
        paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      {children}
      <BottomNav />
      <FcmRegister />
    </div>
  );
}
