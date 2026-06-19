import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats, attendanceTier } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatGameDateTime } from "@/lib/date";
import { gameFormat } from "@/lib/game-format";
import { JoinLeaveButton } from "./JoinLeaveButton";
import { OrganizerActions } from "./OrganizerActions";

export default async function GameDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const session = await auth();
  const userId = session!.user.id;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      field: true,
      organizer: true,
      participants: { include: { user: true }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!game) notFound();

  const isOrganizer = game.organizerId === userId;
  const joined = game.participants.some((p) => p.userId === userId);
  const isPast = game.scheduledAt.getTime() < Date.now();
  const isFull = game.participants.length >= game.totalSpots;
  const { time, day } = formatGameDateTime(game.scheduledAt, locale);
  const organizerStats = await getPlayerStats(game.organizerId);
  const tier = attendanceTier(organizerStats.attendanceRate);

  return (
    <>
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#1c7a45] to-[#0f5530]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 52px)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg" />

        <div className="absolute top-0 left-0 right-0">
          <StatusBar />
        </div>
        <div className="absolute top-12 left-6">
          <BackButton href={`/${locale}/games`} />
        </div>
        <div className="absolute left-6 right-6 bottom-4">
          <div className="flex items-center gap-2">
            <Badge tone={game.status === "COMPLETED" ? "muted" : "success"}>
              {gameFormat(game)}
            </Badge>
            {game.neededPositions.length > 0 && (
              <Badge tone="warning">⚠ нужны</Badge>
            )}
          </div>
          <div className="font-display font-extrabold text-[24px] tracking-tight mt-2">
            {game.field?.name ?? game.fieldName ?? "—"}
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-32 flex flex-col gap-4">
        {joined && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/12 border border-primary/30">
            <span className="text-primary font-display font-extrabold">✓</span>
            <span className="text-primary font-display font-bold text-[14px]">
              {t("games.joined")}
            </span>
          </div>
        )}

        <div className="rounded-2xl bg-surface border border-border p-4">
          <Row label="Когда" value={`${day}, ${time}`} />
          <Row
            label="Где"
            value={`${game.field?.name ?? game.fieldName ?? "—"}${
              game.field?.district ? ` · ${game.field.district}` : ""
            }`}
          />
          <Row label="Формат" value={gameFormat(game)} />
          {game.notes && <Row label="Комментарий" value={game.notes} multiline />}
        </div>

        <div className="rounded-2xl bg-surface border border-border p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-text-muted text-[13px] font-semibold">
              {t("games.spots", {
                current: game.participants.length,
                total: game.totalSpots,
              })}
            </div>
            {game.neededPositions.length > 0 && (
              <div className="text-warning text-[12px] font-bold">
                {game.neededPositions
                  .map((p) => t(`positions.${p}`))
                  .join(", ")}
              </div>
            )}
          </div>
          <ProgressBar filled={game.participants.length} total={game.totalSpots} />
          <div className="mt-4 flex flex-col gap-2.5">
            {game.participants.map((p) => {
              const isMe = p.userId === userId;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <Avatar name={p.user.name} seed={p.user.id} />
                  <div className="flex-1">
                    <div className="font-display font-bold text-[14.5px]">
                      {p.user.name}
                      {isMe && (
                        <span className="text-text-muted font-sans font-normal ml-1.5">
                          (вы)
                        </span>
                      )}
                    </div>
                    <div className="text-text-muted text-[12px]">
                      {p.user.position ? t(`positions.${p.user.position}`) : "—"}
                      {p.user.district && ` · ${p.user.district}`}
                    </div>
                  </div>
                  {joined && p.user.phone && !isMe && (
                    <Link
                      href={`tel:${p.user.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-primary text-[12px] font-bold"
                    >
                      Контакт
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
          <Avatar name={game.organizer.name} seed={game.organizer.id} size={44} />
          <div className="flex-1">
            <div className="text-text-muted text-[11.5px] font-bold uppercase tracking-wide">
              Организатор
            </div>
            <div className="font-display font-bold text-[15px]">
              {game.organizer.name}
            </div>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-[10.5px] font-display font-bold ${
              tier === "reliable"
                ? "bg-primary/15 text-primary"
                : tier === "new"
                ? "bg-white/8 text-text-muted"
                : tier === "poor"
                ? "bg-danger/15 text-danger"
                : "bg-warning/15 text-warning"
            }`}
          >
            {tier === "reliable"
              ? t("attendance.reliable")
              : tier === "new"
              ? t("attendance.new_player")
              : `${organizerStats.attendanceRate}%`}
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 inset-x-0 px-6 pb-3 pt-3 bg-gradient-to-t from-bg via-bg to-transparent z-30">
        {isOrganizer ? (
          <OrganizerActions
            gameId={game.id}
            locale={locale}
            isPast={isPast}
            isCompleted={game.status === "COMPLETED"}
          />
        ) : (
          <JoinLeaveButton
            gameId={game.id}
            joined={joined}
            locale={locale}
            disabled={
              game.status === "CANCELLED" ||
              game.status === "COMPLETED" ||
              (!joined && isFull) ||
              isPast
            }
            label={
              isPast
                ? "Игра прошла"
                : game.status === "CANCELLED"
                ? "Отменена"
                : joined
                ? "Отписаться"
                : isFull
                ? t("games.full")
                : t("games.join")
            }
            variant={joined ? "secondary" : "primary"}
          />
        )}
      </div>
    </>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div
      className={`py-2.5 flex ${
        multiline ? "flex-col gap-1" : "justify-between items-center"
      } border-b border-border last:border-0`}
    >
      <span className="text-text-muted text-[13px] font-semibold">{label}</span>
      <span className="font-display font-bold text-[14.5px]">{value}</span>
    </div>
  );
}

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

function Avatar({ name, seed, size = 36 }: { name: string; seed: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-extrabold text-[12px] text-[#06210F]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, hsl(${hue(seed)} 70% 55%), hsl(${
          (hue(seed) + 30) % 360
        } 70% 40%))`,
      }}
    >
      {initials}
    </div>
  );
}
