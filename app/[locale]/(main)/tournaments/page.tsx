import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { StatusBar } from "@/components/ui/StatusBar";

export default async function TournamentsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 font-display font-extrabold text-[25px]">
        {t("nav.tournaments")}
      </div>
      <p className="px-7 mt-12 text-center text-text-muted text-[14.5px]">
        Турниры появятся позже.
      </p>
    </>
  );
}
