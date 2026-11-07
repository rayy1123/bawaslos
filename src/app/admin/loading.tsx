import { DashboardMetricsSkeleton, Skeleton } from '@/components/Skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f1] pb-20 text-slate-800 animate-fade-in">
      {/* Header Placeholder */}
      <header className="sticky top-0 z-30 border-b border-[#0b1f4b]/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 sm:h-11 sm:w-11 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-6 space-y-6">
        {/* KPI Metrics Skeleton */}
        <DashboardMetricsSkeleton />

        {/* Tab Navigation Skeleton */}
        <div className="flex gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Content Box Skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
          <div className="pt-4 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
