import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, FieldCardSkeleton } from "@/components/ui/Skeleton";

// Instant boundary for the Fields tab (prefetched by BottomNav).
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <Skeleton className="w-32 h-7" />
        <Skeleton className="w-20 h-9 rounded-lg" />
      </div>

      <div className="px-6 pt-4 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <Skeleton className="w-16 h-8 rounded-full" />
          <Skeleton className="w-20 h-8 rounded-full" />
          <Skeleton className="w-16 h-8 rounded-full" />
          <Skeleton className="w-24 h-8 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-16 h-8 rounded-full" />
          <Skeleton className="w-24 h-8 rounded-full" />
          <Skeleton className="w-20 h-8 rounded-full" />
        </div>
      </div>

      <div className="px-6 pt-4 pb-8 flex flex-col gap-3">
        <FieldCardSkeleton />
        <FieldCardSkeleton />
        <FieldCardSkeleton />
      </div>
    </>
  );
}
