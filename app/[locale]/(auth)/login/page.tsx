import { useTranslations } from "next-intl";
import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { StatusBar } from "@/components/ui/StatusBar";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { GoogleSignInButton } from "./GoogleSignInButton";

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  return <Login />;
}

function Login() {
  const t = useTranslations();
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 w-[540px] h-[540px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,.2), rgba(34,197,94,0) 65%)",
        }}
      />
      <StatusBar />
      <div className="relative flex justify-end px-6 pt-4">
        <LocaleToggle />
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-9">
        <div className="w-[86px] h-[86px] rounded-[26px] bg-primary flex items-center justify-center shadow-[0_16px_34px_-10px_rgba(34,197,94,.55)]">
          <div className="w-[34px] h-[34px] rounded-full bg-[#06210F] relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[14px] h-[14px] border-[3px] border-primary rounded-full" />
          </div>
        </div>
        <div className="font-display font-black text-[44px] tracking-tight mt-6">MEÝDAN</div>
        <div className="text-[15.5px] leading-relaxed text-text-muted mt-2.5 max-w-[260px]">
          {t("auth.tagline")}
        </div>
      </div>
      <div className="relative px-7 pb-12 flex flex-col gap-3.5">
        <GoogleSignInButton label={t("auth.google")} />
        <Link
          href={{ pathname: "/login/phone" }}
          className="h-[58px] rounded-lg border border-white/15 text-text font-sans font-semibold text-[16px] flex items-center justify-center"
        >
          {t("auth.phone")}
        </Link>
        <div className="text-center text-[12px] leading-relaxed text-[#5f665f] mt-2 px-4">
          {t("auth.terms")}
        </div>
      </div>
    </div>
  );
}
