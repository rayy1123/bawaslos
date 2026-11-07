import { CandidateCardSkeleton, Skeleton } from '@/components/Skeleton';

export default function VoteLoading() {
  return (
    <div className="min-h-screen bg-[#f6f3ec] animate-fade-in">
      {/* Top Navbar Placeholder */}
      <header className="w-full border-b border-[#0b1f4b]/10 bg-white/90 p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto pt-4">
          <CandidateCardSkeleton />
          <CandidateCardSkeleton />
        </div>
      </main>
    </div>
  );
}
