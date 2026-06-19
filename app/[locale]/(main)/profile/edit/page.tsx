import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POSITIONS, DISTRICTS } from "@/lib/data";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { ProfileEditForm } from "./ProfileEditForm";
import { Locale } from "@/i18n";

export default async function EditProfilePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return null;

  const positions = POSITIONS.map((p) => ({
    value: p.value,
    label: t(`positions.${p.value}`),
  }));

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/profile`} />
        <div className="font-display font-extrabold text-[22px]">
          Редактировать профиль
        </div>
      </div>
      <ProfileEditForm
        user={{
          name: user.name,
          district: user.district,
          position: user.position,
          skillLevel: user.skillLevel,
          age: user.age,
          isOpenToInvite: user.isOpenToInvite,
        }}
        positions={positions}
        districts={DISTRICTS}
        saveLabel={t("common.save")}
      />
    </>
  );
}
