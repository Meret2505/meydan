import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { CreateGameForm } from "./CreateGameForm";

export default async function CreateGamePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();

  const fields = await prisma.field.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/games`} />
        <div className="font-display font-extrabold text-[22px]">
          {t("games.create")}
        </div>
      </div>
      <CreateGameForm
        fields={fields}
        positions={(["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"] as const).map((p) => ({
          value: p,
          label: t(`positions.${p}`),
        }))}
        labels={{
          when: "Когда",
          field: "Поле",
          fieldFree: "Или впиши название поля",
          totalSpots: "Всего игроков",
          needed: "Каких позиций не хватает",
          notes: "Комментарий",
          submit: t("games.create"),
          choose: "выбрать из каталога",
        }}
      />
    </>
  );
}
