import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { CreateGameForm } from "./CreateGameForm";

export default async function CreateGamePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { fieldId?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();

  const fieldRows = await prisma.field.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameTm: true, nameRu: true, district: true },
  });
  const fields = fieldRows.map((f) => ({
    id: f.id,
    name: (locale === "tm" ? f.nameTm : f.nameRu) ?? f.name,
    district: f.district,
  }));

  const preselectedFieldId = fields.find((f) => f.id === searchParams.fieldId)?.id
    ?? null;

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
        preselectedFieldId={preselectedFieldId}
        positions={(["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"] as const).map((p) => ({
          value: p,
          label: t(`positions.${p}`),
        }))}
        labels={{
          when: t("games.create_when"),
          field: t("games.create_field_label"),
          fieldFree: t("games.create_field_free"),
          totalSpots: t("games.create_total"),
          needed: t("games.create_needed"),
          notes: t("games.create_notes"),
          submit: t("games.create"),
          choose: t("games.create_field_choose"),
        }}
      />
    </>
  );
}
