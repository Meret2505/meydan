import { StatusBar } from "@/components/ui/StatusBar";
import { Skeleton, FieldCardSkeleton } from "@/components/ui/Skeleton";

export default function FieldsLoading() {
  return (
    <>
      <StatusBar />
      <div className="px-6 pt-4 flex justify-between items-center">
        <Skeleton className="w-40 h-7" />
        <Skeleton className="w-16 h-9 rounded-lg" />
      </div>
      <div className="px-6 pt-4 flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="w-24 h-9 rounded-full shrink-0" />
          <Skeleton className="w-24 h-9 rounded-full shrink-0" />
          <Skeleton className="w-20 h-9 rounded-full shrink-0" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="w-28 h-9 rounded-full shrink-0" />
          <Skeleton className="w-36 h-9 rounded-full shrink-0" />
        </div>
      </div>
      <div className="px-6 pt-4 pb-8 flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <FieldCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
