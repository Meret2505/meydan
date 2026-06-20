import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

export default function TournamentsLoading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-24">
        <div className="flex justify-between items-center">
          <Skeleton className="w-36 h-7" />
          <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="w-20 h-9 rounded-full" />
          <Skeleton className="w-20 h-9 rounded-full" />
          <Skeleton className="w-24 h-9 rounded-full" />
        </div>
        <div className="flex flex-col gap-2.5 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <RowCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
