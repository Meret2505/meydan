import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, GameCardSkeleton } from "@/components/ui/Skeleton";

// Instant boundary for the Games tab. Because BottomNav prefetches this route,
// tapping the tab swaps to this skeleton with no server round-trip; the real
// feed then streams in via the page's own <Suspense>.
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4">
        <div className="flex justify-between items-center">
          <Skeleton className="w-40 h-7" />
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>

        <div className="flex bg-[var(--overlay)] rounded-2xl p-1 mt-4 gap-1">
          <Skeleton className="flex-1 h-9 rounded-xl" />
          <Skeleton className="flex-1 h-9 rounded-xl" />
        </div>

        <div className="flex gap-2 mt-3.5">
          <Skeleton className="w-20 h-8 rounded-full" />
          <Skeleton className="w-16 h-8 rounded-full" />
          <Skeleton className="w-24 h-8 rounded-full" />
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 flex flex-col gap-3.5">
        <GameCardSkeleton />
        <GameCardSkeleton />
        <GameCardSkeleton />
      </div>
    </>
  );
}
