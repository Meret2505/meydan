import { useTranslations } from "next-intl";
import { attendanceTier } from "@/lib/stats";
import { cn } from "@/lib/utils";

const tones: Record<ReturnType<typeof attendanceTier>, string> = {
  reliable: "bg-primary/15 text-primary",
  ok: "bg-warning/15 text-warning",
  poor: "bg-danger/15 text-danger",
  new: "bg-white/8 text-text-muted",
};

export function AttendanceBadge({
  rate,
  className,
}: {
  rate: number | null;
  className?: string;
}) {
  const t = useTranslations("attendance");
  const tier = attendanceTier(rate);
  const label =
    tier === "reliable"
      ? t("reliable")
      : tier === "new"
      ? t("new_player")
      : `${rate}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display font-bold text-[10.5px]",
        tones[tier],
        className,
      )}
    >
      {label}
    </span>
  );
}
