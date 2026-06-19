import { cn } from "@/lib/utils";

type Tone = "primary" | "warning" | "danger" | "muted" | "success";

const styles: Record<Tone, string> = {
  primary: "bg-primary/15 text-primary border-primary/30",
  warning: "bg-warning/15 text-warning border-warning/25",
  danger: "bg-danger/15 text-danger border-danger/30",
  muted: "bg-white/8 text-text-muted border-white/8",
  success: "bg-primary text-primary-text border-transparent",
};

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-display font-bold text-[11.5px] uppercase tracking-wide",
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
