import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="rounded border p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-18 w-18 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="rounded border">
          {Array.from({ length: 5 }).map((_, i) => (
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
    </div>
  );
}
