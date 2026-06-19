import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white/5 rounded-md animate-pulse",
        className,
      )}
    />
  );
}

export function GameCardSkeleton() {
  return (
    <div className="rounded-[22px] bg-surface border border-border p-4">
      <div className="flex justify-between">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-12 h-5 rounded-full" />
      </div>
      <Skeleton className="w-44 h-3.5 mt-3" />
      <Skeleton className="h-[7px] mt-4 rounded" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="w-7 h-7 rounded-full" />
      </div>
    </div>
  );
}
