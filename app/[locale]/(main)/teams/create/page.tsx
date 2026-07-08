import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { CreateTeamForm } from "./CreateTeamForm";
import { DISTRICTS } from "@/lib/data";

export default async function CreateTeamPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/teams`} />
        <div className="font-display font-extrabold text-[22px]">{t("teams.create_title")}</div>
      </div>
      <CreateTeamForm
        districts={DISTRICTS}
        labels={{
          name: t("teams.name_label"),
          district: t("teams.district_label"),
          submit: t("common.save"),
          hint: t("teams.captain_hint"),
        }}
      />
    </>
  );
}
