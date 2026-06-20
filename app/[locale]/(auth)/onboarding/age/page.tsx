import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { AgeForm } from "./AgeForm";

const RANGES: { label: string; mid: number }[] = [
  { label: "18–24", mid: 21 },
  { label: "25–34", mid: 29 },
  { label: "35+", mid: 37 },
];

export default async function AgePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { age: true },
  });

  return (
    <>
      <OnboardingHeader step={5} backHref={`/${locale}/onboarding/district`} />
      <div className="px-7 pt-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tight">
          {t("onboarding.age_title")}
        </h1>
        <p className="text-[15px] text-text-muted mt-2">{t("onboarding.age_sub")}</p>
      </div>
      <AgeForm
        ranges={RANGES}
        initial={user?.age ?? null}
        finishLabel={t("onboarding.finish")}
        skipLabel={t("common.skip")}
      />
    </>
  );
}
