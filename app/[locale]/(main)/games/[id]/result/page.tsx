import { notFound, redirect } from "next/navigation";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { ResultForm } from "./ResultForm";

export default async function ResultPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, position: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!game) notFound();
  if (game.organizerId !== session!.user.id) redirect(`/${locale}/games/${id}`);

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/games/${id}`} />
        <div className="font-display font-extrabold text-[22px]">
          {t("games.result")}
        </div>
      </div>
      <ResultForm
        gameId={game.id}
        defaultScoreHome={game.scoreHome ?? 0}
        defaultScoreAway={game.scoreAway ?? 0}
        participants={game.participants.map((p) => ({
          userId: p.user.id,
          name: p.user.name,
          position: p.user.position
            ? t(`positions.${p.user.position}`)
            : null,
          attended: p.attended,
        }))}
        labels={{ save: t("common.save"), came: "Пришёл" }}
      />
    </>
  );
}
