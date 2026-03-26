import { Skeleton } from "@/components/ui/skeleton";

export default function TestCaseDetailLoading() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-8 w-64" />
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

      <div className="mt-6">
        <Skeleton className="h-6 w-28" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
