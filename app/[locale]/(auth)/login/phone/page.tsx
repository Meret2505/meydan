import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { PhoneLoginForm } from "./PhoneLoginForm";

export default async function PhoneLoginPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="min-h-dvh flex flex-col">
      <StatusBar />
      <div className="px-6 pt-4">
        <BackButton href={`/${locale}/login`} />
      </div>
      <div className="px-7 pt-7">
        <h1 className="font-display font-extrabold text-[29px] tracking-tight">
          {t("auth.phone_title")}
        </h1>
        <p className="text-[15px] text-text-muted mt-2">{t("auth.phone_sub")}</p>
      </div>
      <PhoneLoginForm
        labels={{
          phone: t("auth.phone_label"),
          password: t("auth.password_label"),
          login: t("auth.login"),
        }}
      />
    </div>
  );
}
