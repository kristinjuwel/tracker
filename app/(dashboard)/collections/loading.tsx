import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
