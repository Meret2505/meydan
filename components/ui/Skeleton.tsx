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

export function FieldCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
      <Skeleton className="h-24 rounded-none" />
      <div className="px-[15px] py-[13px]">
        <Skeleton className="w-40 h-4" />
        <div className="flex gap-2 mt-2.5">
          <Skeleton className="w-20 h-6 rounded-[7px]" />
          <Skeleton className="w-24 h-6 rounded-[7px]" />
          <Skeleton className="w-12 h-6 rounded-[7px]" />
        </div>
      </div>
    </div>
  );
}

export function RowCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-20 h-3 mt-2" />
      </div>
      <Skeleton className="w-10 h-5 rounded-full" />
    </div>
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
