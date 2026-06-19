import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";

export default async function GamesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, district: true },
  });

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <div className="font-display font-extrabold text-[25px]">
          {t("games.feed_title")}
        </div>
        <div className="text-text-muted text-[13px] font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {user?.district ?? "—"}
        </div>
      </div>

      <div className="px-7 mt-16 text-center text-text-muted">
        <p className="font-display font-extrabold text-[20px] text-text">
          {user?.name ? `Привет, ${user.name.split(" ")[0]}!` : "Привет!"}
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed">
          Лента игр появится здесь на следующем этапе сборки.
        </p>
      </div>
    </>
  );
}
