import { cn } from "@/lib/utils";

export function ProgressBar({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (filled / total) * 100));
  const tone =
    pct >= 100 ? "bg-warning" : pct >= 70 ? "bg-primary" : "bg-primary";
  return (
    <div className={cn("h-[7px] rounded bg-white/8 overflow-hidden", className)}>
      <div className={cn("h-full rounded", tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}
