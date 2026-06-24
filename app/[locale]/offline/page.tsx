import { unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// The service worker falls back to this page (rendered at build time) when the
// device is offline and the requested document can't be fetched. Keep it tiny
// and self-contained — no network, no client JS dependencies.
export default function OfflinePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const tm = locale === "tm";
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-8 text-center text-text">
      <div
        className="w-[78px] h-[78px] rounded-[22px] flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(140deg,#1FD16B,#14a955)" }}
      >
        <div className="w-[30px] h-[30px] rounded-full bg-[#06210F] relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[12px] h-[12px] border-[3px] border-[#1FD16B] rounded-full" />
        </div>
      </div>
      <h1 className="font-display font-extrabold text-[24px] tracking-tight">
        {tm ? "Internet ýok" : "Нет интернета"}
      </h1>
      <p className="text-text-muted text-[14.5px] leading-relaxed mt-2 max-w-[280px]">
        {tm
          ? "Birikmäňizi barlap, sahypany täzeden açyň."
          : "Проверь подключение и попробуй снова."}
      </p>
    </main>
  );
}
