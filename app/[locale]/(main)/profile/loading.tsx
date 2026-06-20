import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, RowCardSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 pb-24">
        <div className="flex items-center gap-4">
          <Skeleton className="w-[68px] h-[68px] rounded-full shrink-0" />
          <div className="flex-1">
            <Skeleton className="w-40 h-6" />
            <Skeleton className="w-24 h-4 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-6">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="w-28 h-4 mt-7" />
        <div className="flex flex-col gap-2.5 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
