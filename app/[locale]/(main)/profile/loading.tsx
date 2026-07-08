import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton } from "@/components/ui/Skeleton";

// Instant boundary for the Profile tab (prefetched by BottomNav).
export default function Loading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-3.5 pb-24">
        <div className="flex items-center gap-4">
          <Skeleton className="w-[74px] h-[74px] rounded-full shrink-0" />
          <div className="flex-1">
            <Skeleton className="w-40 h-6" />
            <Skeleton className="w-28 h-3.5 mt-2" />
          </div>
        </div>

        <Skeleton className="w-full h-12 rounded-2xl mt-3.5" />

        <div className="flex gap-3 mt-4">
          <Skeleton className="basis-[58%] h-[132px] rounded-[18px]" />
          <div className="flex-1 flex flex-col gap-2.5">
            <Skeleton className="flex-1 h-[61px] rounded-[18px]" />
            <Skeleton className="flex-1 h-[61px] rounded-[18px]" />
          </div>
        </div>

        <Skeleton className="w-32 h-4 mt-5 mb-3" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="w-full h-[62px] rounded-[14px]" />
          <Skeleton className="w-full h-[62px] rounded-[14px]" />
        </div>

        <Skeleton className="w-24 h-4 mt-5 mb-3" />
        <Skeleton className="w-full h-[180px] rounded-2xl" />
      </div>
    </>
  );
}
