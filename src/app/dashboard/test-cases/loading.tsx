import { Skeleton } from "@/components/ui/skeleton";

export default function TestCasesLoading() {
  return (
    <div className="flex h-full gap-0 -m-6">
      {/* Left Panel Skeleton */}
      <div className="w-72 shrink-0 border-r bg-muted/30">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-2 space-y-2">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="mt-4 h-4 w-16" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className="flex-1">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
