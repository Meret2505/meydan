import { unstable_setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations();
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6">
        <div className="w-9 h-9 rounded-full bg-[#06210F] relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-[3px] border-primary rounded-full" />
        </div>
      </div>
      <h1 className="font-display font-black text-5xl tracking-tight">MEÝDAN</h1>
      <p className="mt-3 text-text-muted max-w-xs">{t("auth.tagline")}</p>
      <a
        href="login"
        className="mt-10 inline-flex h-14 px-8 items-center justify-center rounded-lg bg-primary text-primary-text font-display font-extrabold"
      >
        {t("auth.login")}
      </a>
    </main>
  );
}
