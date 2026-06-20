import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="text-5xl">🥅</div>
      <h1 className="font-display font-extrabold text-[22px]">{t("errors.not_found_title")}</h1>
      <p className="text-text-muted text-[14px] max-w-xs">
        {t("errors.not_found_sub")}
      </p>
      <Link
        href="/"
        className="mt-2 h-11 px-5 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[14px] inline-flex items-center"
      >
        {t("errors.go_home")}
      </Link>
    </div>
  );
}
