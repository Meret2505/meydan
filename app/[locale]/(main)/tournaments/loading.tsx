import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

// Instant boundary for the Tournaments tab (prefetched by BottomNav).
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <Skeleton className="w-40 h-7" />
        <Skeleton className="w-24 h-9 rounded-lg" />
      </div>

      <div className="px-6 pt-4">
        <div className="flex bg-[var(--overlay)] rounded-2xl p-1 gap-1">
          <Skeleton className="flex-1 h-9 rounded-xl" />
          <Skeleton className="flex-1 h-9 rounded-xl" />
          <Skeleton className="flex-1 h-9 rounded-xl" />
        </div>
      </div>

      <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
        <RowCardSkeleton />
        <RowCardSkeleton />
        <RowCardSkeleton />
        <RowCardSkeleton />
      </div>
    </>
  );
}
