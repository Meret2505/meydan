import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { PhoneForm } from "./PhoneForm";

export default async function PhonePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { phone: true },
  });

  return (
    <>
      <OnboardingHeader step={2} backHref={`/${locale}/onboarding/name`} />
      <div className="px-7 pt-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tight">
          {t("onboarding.phone_title")}
        </h1>
        <p className="text-[15px] leading-relaxed text-text-muted mt-2">
          {t("onboarding.phone_sub")}
        </p>
      </div>
      <PhoneForm
        initial={user?.phone?.replace(/^\+993/, "") ?? ""}
        privateHint={t("onboarding.private_hint")}
        nextLabel={t("common.next")}
      />
    </>
  );
}
