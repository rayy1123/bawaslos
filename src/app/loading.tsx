import { CandidateCardSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 animate-fade-in">
      {/* Hero Skeleton Shimmer */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs sm:p-12">
        <div className="flex flex-col items-center">
          {/* Logo seal placeholder */}
          <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-full" />

          {/* Org tag placeholder */}
          <Skeleton className="mt-5 h-5 w-28 rounded-full" />

          {/* Title placeholder */}
          <Skeleton className="mt-3 h-9 sm:h-12 w-3/4 max-w-xl rounded-xl" />
          <Skeleton className="mt-2.5 h-4 w-1/2 max-w-md rounded-md" />

          {/* Subtext placeholder */}
          <div className="mt-4 space-y-2 max-w-lg w-full flex flex-col items-center">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
          </div>

          {/* Buttons placeholder */}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Skeleton className="h-12 w-44 rounded-xl" />
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>
        </div>
      </section>

      {/* Trust Pillars Skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Candidate Cards Skeleton Grid */}
      <div className="mt-12 sm:mt-16">
        <div className="flex flex-col items-center space-y-2 text-center mb-8">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
          <CandidateCardSkeleton />
          <CandidateCardSkeleton />
        </div>
      </div>
    </div>
  );
}
