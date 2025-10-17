import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="rounded border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-8 gap-3 border-t p-3 first:border-t-0"
          >
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
            <Skeleton className="h-4 col-span-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
