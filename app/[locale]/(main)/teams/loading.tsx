import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

// Instant boundary for the Teams tab (prefetched by BottomNav).
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-24">
        <Skeleton className="w-32 h-7" />

        <Skeleton className="w-24 h-3.5 mt-5 mb-3" />
        <div className="flex flex-col gap-3">
          <RowCardSkeleton />
          <RowCardSkeleton />
        </div>

        <Skeleton className="w-full h-[50px] rounded-[14px] mt-3" />

        <Skeleton className="w-28 h-3.5 mt-6 mb-3" />
        <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-[13px] border-b border-border last:border-0"
            >
              <Skeleton className="w-4 h-4" />
              <Skeleton className="flex-1 h-4" />
              <Skeleton className="w-6 h-4" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
