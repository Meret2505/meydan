import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

export default function TeamsLoading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-24">
        <Skeleton className="w-36 h-7" />
        <Skeleton className="w-28 h-4 mt-5" />
        <div className="flex flex-col gap-2.5 mt-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <RowCardSkeleton key={`mine-${i}`} />
          ))}
        </div>
        <Skeleton className="w-32 h-4 mt-7" />
        <div className="flex flex-col gap-2.5 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <RowCardSkeleton key={`other-${i}`} />
          ))}
        </div>
      </div>
    </>
  );
}
