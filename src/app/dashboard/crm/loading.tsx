import { Skeleton } from "@/components/ui/skeleton"

export default function CRMLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Tab buttons skeleton */}
          <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Kanban Board Skeleton */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex gap-4 h-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[320px] min-w-[320px] flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>

              {/* Cards skeleton */}
              <div className="flex-1 space-y-2">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="p-3 bg-card border border-border rounded-lg space-y-2"
                    style={{ opacity: 1 - (j * 0.2) }}
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
