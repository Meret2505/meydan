import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/stats";
import { StatusBar } from "@/components/ui/StatusBar";
import { BackButton } from "@/components/ui/BackButton";
import { formatGameDateTime } from "@/lib/date";
import { gameFormat } from "@/lib/game-format";
import { JoinLeaveButton } from "./JoinLeaveButton";
import { OrganizerActions } from "./OrganizerActions";
import { ContactSheetTrigger } from "./ContactSheetTrigger";

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function avatarStyle(seed: string) {
  return {
    background: `linear-gradient(140deg, hsl(${hue(seed)} 70% 55%), hsl(${
      (hue(seed) + 30) % 360
    } 70% 40%))`,
  };
}
const POSITION_ABBR: Record<string, string> = {
  GOALKEEPER: "ВРТ",
  DEFENDER: "ЗАЩ",
  MIDFIELDER: "ПЗ",
  FORWARD: "НАП",
};

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
  const isOver = game.status === "COMPLETED" || game.status === "CANCELLED";
  const { time, day } = formatGameDateTime(game.scheduledAt, locale);
  const organizerStats = await getPlayerStats(game.organizerId);
  const filledCount = game.participants.length;
  const openSlots = Math.max(0, game.totalSpots - filledCount);
  const fillPct = Math.min(100, (filledCount / game.totalSpots) * 100);
  const firstNeeded = game.neededPositions[0];

  const orgPhone = joined ? game.organizer.phone : null;

  return (
    <>
      {/* Pitch header */}
      <div
        className="relative h-52 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1c7a45,#0f5530)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 52px)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/35" />
        <div className="absolute inset-x-0 top-1/2 h-[2px] bg-white/35" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(11,14,13,.35),rgba(11,14,13,0) 35%,rgba(11,14,13,.9))",
          }}
        />
        <div className="absolute top-0 left-0 right-0">
          <StatusBar />
        </div>
        <div className="absolute top-12 left-[22px]">
          <BackButton href={`/${locale}/games`} />
        </div>
        <div className="absolute left-6 right-6 bottom-[18px]">
          <span
            className="px-[10px] py-[5px] rounded-full font-display font-extrabold text-[11px] uppercase tracking-wide"
            style={{ background: "rgba(31,209,107,.92)", color: "#06210F" }}
          >
            {gameFormat(game)} ·{" "}
            {isOver ? "ИГРА ЗАВЕРШЕНА" : isOrganizer ? "ВАША ИГРА" : "ОТКРЫТАЯ ИГРА"}
          </span>
          <div className="font-display font-extrabold text-[26px] tracking-tight mt-2.5">
            {game.field?.name ?? game.fieldName ?? "—"}
          </div>
        </div>
      </div>

      <div className="px-6 pt-[18px] pb-40 flex flex-col gap-[14px]">
        {joined && (
          <div className="flex items-center gap-3 px-[15px] py-[13px] rounded-2xl bg-primary/[0.13] border border-primary/30">
            <div className="w-[34px] h-[34px] rounded-full bg-primary text-primary-text flex items-center justify-center font-display font-black text-[17px] shrink-0">
              ✓
            </div>
            <div className="text-[13.5px] leading-snug text-[#C9F0D8]">
              Вы в игре! {day} {time}, {game.field?.name ?? game.fieldName ?? "—"}.
            </div>
          </div>
        )}

        {/* When + Price */}
        <div className="flex gap-2.5">
          <InfoTile label="Когда" value={`${day} · ${time}`} />
          <InfoTile
            label="Цена"
            value={game.pricePerPlayer != null ? `${game.pricePerPlayer} ман / чел` : "—"}
          />
        </div>

        {/* Roster card */}
        <div className="bg-surface border border-border rounded-[18px] p-4">
          <div className="flex justify-between items-center">
            <span className="font-display font-bold text-[15px]">Состав</span>
            <span className="font-display font-extrabold text-[14px] text-primary-soft">
              {filledCount} / {game.totalSpots}
            </span>
          </div>
          <div className="mt-3 h-[7px] rounded bg-white/8 overflow-hidden">
            <div className="h-full bg-primary rounded" style={{ width: `${fillPct}%` }} />
          </div>
          <div className="mt-3.5 flex items-center">
            {game.participants.slice(0, 7).map((p, i) => (
              <div
                key={p.id}
                className="w-[34px] h-[34px] rounded-full border-2 border-surface flex items-center justify-center font-display font-extrabold text-[12px] text-[#06210F]"
                style={{
                  ...avatarStyle(p.user.id),
                  marginLeft: i === 0 ? 0 : -8,
                }}
              >
                {p.userId === userId ? "Ты" : initials(p.user.name)}
              </div>
            ))}
            {openSlots > 0 && (
              <div
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-bold text-[13px] text-text-muted"
                style={{
                  marginLeft: -8,
                  background: "#0B0E0D",
                  border: "1.5px dashed rgba(255,255,255,.2)",
                }}
              >
                {openSlots}
              </div>
            )}
          </div>
        </div>

        {/* Needed-position warning */}
        {firstNeeded && (
          <div className="flex items-center gap-3 px-[15px] py-[13px] rounded-2xl bg-warning/10 border border-warning/30">
            <div
              className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center font-display font-black text-[14px] text-warning shrink-0"
              style={{ background: "rgba(242,181,60,.18)" }}
            >
              {POSITION_ABBR[firstNeeded] ?? "?"}
            </div>
            <div className="text-[13.5px] leading-snug text-[#E8D6AE]">
              Нужен{" "}
              <b className="text-warning">
                {t(`positions.${firstNeeded}`).toLowerCase()}
              </b>
              . Команде не хватает именно этой позиции.
            </div>
          </div>
        )}

        {/* Organizer */}
        <div className="flex items-center gap-3 mt-1">
          <div
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-display font-extrabold text-[15px] text-[#06210F]"
            style={avatarStyle(game.organizer.id)}
          >
            {initials(game.organizer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[14.5px] truncate">
              {game.organizer.name}
            </div>
            <div className="text-[12.5px] text-text-muted font-semibold mt-0.5 truncate">
              Организатор
              {organizerStats.attendanceRate !== null &&
                ` · явка ${organizerStats.attendanceRate}%`}
              {organizerStats.gamesPlayed > 0 &&
                ` · ${organizerStats.gamesPlayed} игр`}
            </div>
          </div>
        </div>

        {/* Find player button (organizer only, future game with needed positions) */}
        {isOrganizer && !isPast && firstNeeded && !isOver && (
          <Link
            href={`/${locale}/players?back=/${locale}/games/${game.id}&position=${firstNeeded}`}
            className="w-full h-[50px] mt-1 rounded-[14px] border border-white/15 bg-transparent text-text font-sans font-bold text-[14.5px] flex items-center justify-center gap-2"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            Найти {t(`positions.${firstNeeded}`).toLowerCase()}а на эту игру
          </Link>
        )}

        {/* Contact organizer (when joined and not organizer) */}
        {joined && !isOrganizer && orgPhone && (
          <ContactSheetTrigger
            name={game.organizer.name}
            phone={orgPhone}
            seed={game.organizer.id}
          />
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div
        className="fixed bottom-20 inset-x-0 z-30 px-6 pt-4 pb-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,14,13,0), #0B0E0D 28%)",
        }}
      >
        {isOrganizer ? (
          <OrganizerActions
            gameId={game.id}
            locale={locale}
            isPast={isPast}
            isCompleted={game.status === "COMPLETED"}
          />
        ) : isOver ? (
          <div className="h-[58px] rounded-2xl border border-white/10 text-text-muted flex items-center justify-center font-display font-bold text-[14px]">
            {game.status === "CANCELLED" ? "Игра отменена" : "Игра завершена"}
          </div>
        ) : joined ? (
          <JoinLeaveButton
            gameId={game.id}
            joined
            locale={locale}
            disabled={isPast}
            variant="joined"
            label="✓ Вы в игре · отменить запись"
          />
        ) : (
          <JoinLeaveButton
            gameId={game.id}
            joined={false}
            locale={locale}
            disabled={isPast || isFull}
            variant="primary"
            label={isFull ? "Мест нет" : isPast ? "Игра прошла" : "Записаться · занять место"}
          />
        )}
      </div>
    </>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-surface border border-border rounded-2xl px-[14px] py-[13px]">
      <div className="text-[12px] text-text-muted font-semibold">{label}</div>
      <div className="font-display font-bold text-[15px] mt-1">{value}</div>
    </div>
  );
}
