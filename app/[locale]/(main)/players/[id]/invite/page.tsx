import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatGameDateTime } from "@/lib/date";
import { gameFormat } from "@/lib/game-format";
import { InviteButton } from "./InviteButton";

export default async function InvitePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const senderId = session!.user.id;

  const receiver = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, isOpenToInvite: true },
  });
  if (!receiver) notFound();

  const games = await prisma.game.findMany({
    where: {
      organizerId: senderId,
      status: { in: ["OPEN", "FULL"] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      field: { select: { name: true, district: true } },
      _count: { select: { participants: true } },
      invites: { where: { receiverId: id }, select: { id: true } },
      participants: { where: { userId: id }, select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const eligible = games.filter((g) => g._count.participants < g.totalSpots);

  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex items-center gap-4">
        <BackButton href={`/${locale}/players/${id}`} />
        <div className="font-display font-extrabold text-[20px]">
          {t("players.invite_title", { name: receiver.name })}
        </div>
      </div>

      {!receiver.isOpenToInvite ? (
        <div className="px-7 pt-10 text-center text-text-muted text-[14px]">
          {t("players.closed_to_invites")}
        </div>
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">📅</span>}
          title={t("players.no_eligible_game")}
          description={t("players.no_eligible_game_sub")}
          action={{ label: t("games.create"), href: `/${locale}/games/create` }}
        />
      ) : (
        <div className="px-6 pt-6 pb-8 flex flex-col gap-3">
          {eligible.map((g) => {
            const { time, day } = formatGameDateTime(g.scheduledAt, locale);
            const remaining = g.totalSpots - g._count.participants;
            const alreadyInvited = g.invites.length > 0;
            const alreadyJoined = g.participants.length > 0;
            return (
              <div
                key={g.id}
                className="rounded-2xl bg-surface border border-border p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-extrabold text-[18px]">
                        {time}
                      </span>
                      <span className="text-text-muted text-[13px] font-semibold">
                        {day}
                      </span>
                    </div>
                    <div className="text-[13.5px] text-text/85 mt-1 font-semibold">
                      {g.field?.name ?? g.fieldName ?? "—"}
                      {g.field?.district && (
                        <span className="text-text-muted"> · {g.field.district}</span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/8 text-text-muted font-display font-bold text-[11px]">
                    {gameFormat(g)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-text-muted text-[13px]">
                    {t("players.free_spots") + ": "}<span className="text-text font-bold">{remaining}</span>
                  </span>
                  {alreadyJoined ? (
                    <Link
                      href={`/${locale}/games/${g.id}`}
                      className="text-primary font-bold text-[13px]"
                    >
                      {t("players.already_joined") + " →"}
                    </Link>
                  ) : alreadyInvited ? (
                    <span className="text-text-muted text-[12.5px] font-bold">
                      {t("players.invite_sent")}
                    </span>
                  ) : (
                    <InviteButton gameId={g.id} receiverId={id} locale={locale} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
