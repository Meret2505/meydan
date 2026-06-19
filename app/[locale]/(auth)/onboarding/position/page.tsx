import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { POSITIONS } from "@/lib/data";
import { PositionForm } from "./PositionForm";
import { Locale } from "@/i18n";

export default async function PositionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { position: true },
  });

  const items = POSITIONS.map((p) => ({
    value: p.value,
    label: t(`positions.${p.value}`),
    abbr: p.abbr[locale as Locale],
    sub: p.sub[locale as Locale],
  }));

  return (
    <>
      <OnboardingHeader step={3} backHref={`/${locale}/onboarding/phone`} />
      <div className="px-7 pt-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tight">
          {t("onboarding.position_title")}
        </h1>
        <p className="text-[15px] text-text-muted mt-2">
          {t("onboarding.position_sub")}
        </p>
      </div>
      <PositionForm
        items={items}
        initial={user?.position ?? null}
        nextLabel={t("common.next")}
      />
    </>
  );
}
