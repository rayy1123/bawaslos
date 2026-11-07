import { ScoreboardCardSkeleton, Skeleton } from '@/components/Skeleton';

export default function ScoreboardLoading() {
  return (
    <main className="arena-grid flex-grow flex flex-col items-center justify-center px-4 py-10 w-full max-w-[1280px] mx-auto relative lg:px-16 animate-fade-in">
      {/* Title + Total Votes Shimmer */}
      <div className="text-center mb-14 z-10 relative w-full flex flex-col items-center">
        <Skeleton className="h-4 w-48 rounded-full mb-3" />
        <Skeleton className="h-12 w-80 max-w-full rounded-2xl mb-6" />

        <div className="inline-flex flex-col items-center bg-[#1B2E4B] p-6 rounded-2xl shadow-xl border border-[#C5A059]/30 w-72">
          <Skeleton className="h-3.5 w-32 rounded-full mb-3" dark={true} />
          <Skeleton className="h-14 w-40 rounded-xl mb-2" dark={true} />
          <Skeleton className="h-3 w-48 rounded-md" dark={true} />
        </div>
      </div>

      {/* Cards Shimmer Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 items-end relative">
        <ScoreboardCardSkeleton />
        <ScoreboardCardSkeleton />
      </div>
    </main>
  );
}
