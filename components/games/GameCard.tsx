import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatGameDateTime } from "@/lib/date";
import type { Position } from "@prisma/client";

export interface GameCardData {
  id: string;
  scheduledAt: Date;
  venue: string;
  district: string | null;
  format: string;
  totalSpots: number;
  joinedCount: number;
  neededPositions: Position[];
  participants: { id: string; name: string }[];
  mine?: boolean;
}

export function GameCard({ game }: { game: GameCardData }) {
  const locale = useLocale();
  const t = useTranslations();
  const { time, day } = formatGameDateTime(game.scheduledAt, locale);
  const remaining = game.totalSpots - game.joinedCount;
  const isFull = remaining <= 0;
  const spotsLabel = isFull
    ? t("games.full")
    : t("games.spots", { current: game.joinedCount, total: game.totalSpots });

  return (
    <Link
      href={`/${locale}/games/${game.id}`}
      className="block rounded-[22px] bg-surface border border-border p-4 active:scale-[0.995] transition-transform"
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-[19px]">{time}</span>
            <span className="text-[13px] text-text-muted font-semibold">{day}</span>
          </div>
          <div className="text-[14px] text-text/80 mt-1 font-semibold truncate max-w-[220px]">
            {game.venue}
            {game.district && (
              <span className="text-text-muted"> · {game.district}</span>
            )}
          </div>
        </div>
        <Badge tone={game.mine ? "primary" : "muted"} className="shrink-0">
          {game.mine ? t("games.your_game") : game.format}
        </Badge>
      </div>

      {game.neededPositions.length > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning/12 border border-warning/25 text-warning text-[12px] font-bold">
          <span>⚠</span>
          {game.neededPositions
            .map((p) => t("games.needed", { position: t(`positions.${p}`).toLowerCase() }))
            .join(" · ")}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3.5">
        <ProgressBar filled={game.joinedCount} total={game.totalSpots} className="flex-1" />
        <span
          className={`font-display font-bold text-[13px] whitespace-nowrap ${
            isFull ? "text-text-muted" : "text-primary"
          }`}
        >
          {spotsLabel}
        </span>
      </div>

      <div className="flex justify-between items-center mt-3.5">
        <AvatarStack people={game.participants} />
      </div>
    </Link>
  );
}
