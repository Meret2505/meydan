import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { NameForm } from "./NameForm";

export default async function NamePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true },
  });
  const initials = (user?.name ?? "")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <>
      <OnboardingHeader step={1} backHref={`/${locale}/login`} />
      <div className="px-7 pt-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tight">
          {t("onboarding.name_title")}
        </h1>
        <p className="text-[15px] text-text-muted mt-2">{t("onboarding.name_sub")}</p>
      </div>
      <div className="flex flex-col items-center px-7 pt-9">
        <div className="relative w-[104px] h-[104px] rounded-full flex items-center justify-center font-display font-extrabold text-[38px] text-[#06210F]"
          style={{ background: "linear-gradient(140deg,#22c55e,#14a955)" }}>
          {initials}
        </div>
      </div>
      <NameForm initial={user?.name ?? ""} nextLabel={t("common.next")} />
    </>
  );
}
