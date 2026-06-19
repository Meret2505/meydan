import { unstable_setRequestLocale } from "next-intl/server";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { CreateTournamentForm } from "./CreateTournamentForm";

export default async function CreateTournamentPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/tournaments`} />
        <div className="font-display font-extrabold text-[22px]">Создать турнир</div>
      </div>
      <CreateTournamentForm />
    </>
  );
}
