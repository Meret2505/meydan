import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { DISTRICTS } from "@/lib/data";
import { DistrictForm } from "./DistrictForm";

export default async function DistrictPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { district: true },
  });

  return (
    <>
      <OnboardingHeader step={4} backHref={`/${locale}/onboarding/position`} />
      <div className="px-7 pt-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tight">
          {t("onboarding.district_title")}
        </h1>
        <p className="text-[15px] text-text-muted mt-2">
          {t("onboarding.district_sub")}
        </p>
      </div>
      <DistrictForm
        districts={DISTRICTS}
        initial={user?.district ?? null}
        nextLabel={t("common.next")}
      />
    </>
  );
}
