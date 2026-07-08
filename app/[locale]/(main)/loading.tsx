import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

// Group-level fallback boundary: covers every (main) route that doesn't define
// its own loading.tsx (detail pages, notifications, etc.) so those transitions
// are instant too, not just the bottom-nav tabs.
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-8">
        <Skeleton className="w-44 h-7" />
        <div className="flex flex-col gap-3 mt-5">
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
        </div>
      </div>
    </>
  );
}
