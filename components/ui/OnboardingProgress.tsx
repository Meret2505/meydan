import { cn } from "@/lib/utils";

export function OnboardingProgress({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center gap-4 flex-1">
      <div className="flex-1 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1 rounded-sm",
              i < step ? "bg-primary" : "bg-white/10",
            )}
          />
        ))}
      </div>
      <span className="font-display font-bold text-[13px] text-[#8A938E] whitespace-nowrap">
        {step}/{total}
      </span>
    </div>
  );
}
