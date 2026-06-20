import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, GameCardSkeleton } from "@/components/ui/Skeleton";

export default function GamesLoading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4">
        <div className="flex justify-between items-center">
          <Skeleton className="w-36 h-7" />
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
        <Skeleton className="h-12 rounded-2xl mt-4" />
        <div className="flex gap-2 mt-3.5">
          <Skeleton className="w-20 h-9 rounded-full" />
          <Skeleton className="w-14 h-9 rounded-full" />
          <Skeleton className="w-32 h-9 rounded-full" />
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
