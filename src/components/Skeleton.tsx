import React from 'react';

type SkeletonProps = {
  className?: string;
  dark?: boolean;
};

// Base Shimmer Skeleton Element
export function Skeleton({ className = '', dark = false }: SkeletonProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden relative ${
        dark ? 'bg-white/10 shimmer-dark' : 'bg-slate-200/70 shimmer'
      } ${className}`}
    />
  );
}

// Skeleton for Candidate Cards (Homepage & Vote Page)
export function CandidateCardSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border p-5 shadow-xs ${
        dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
      }`}
    >
      {/* Photo frame skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-xl" dark={dark} />

      <div className="mt-4 space-y-3">
        <div className="flex justify-center">
          <Skeleton className="h-6 w-3/4 rounded-lg" dark={dark} />
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-4 w-1/2 rounded-md" dark={dark} />
        </div>

        {/* Vision Box skeleton */}
        <div className="rounded-xl border border-slate-100 p-3 space-y-2 mt-2">
          <Skeleton className="h-3 w-1/4 rounded" dark={dark} />
          <Skeleton className="h-3 w-full rounded" dark={dark} />
          <Skeleton className="h-3 w-5/6 rounded" dark={dark} />
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-10 w-full rounded-xl mt-4" dark={dark} />
      </div>
    </div>
  );
}

// Skeleton for Scoreboard Arena
export function ScoreboardCardSkeleton() {
  return (
    <div className="flex flex-col items-center w-full bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2.5 bg-slate-200" />
      {/* Square Photo frame skeleton */}
      <Skeleton className="w-52 h-52 sm:w-60 sm:h-60 rounded-2xl mb-5" />

      {/* Candidate Name skeleton */}
      <Skeleton className="h-7 w-40 rounded-lg mb-2" />
      <Skeleton className="h-4 w-52 rounded-md mb-6" />

      {/* Score and Pillar skeleton */}
      <div className="flex items-end justify-between w-full h-[260px] gap-6">
        <div className="flex-grow flex flex-col justify-end items-end h-full space-y-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="w-20 h-full bg-slate-100 rounded-t-xl overflow-hidden border border-slate-200 flex items-end">
          <Skeleton className="w-full h-3/5 rounded-t-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for Dashboard Metric Cards
export function DashboardMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for DPT / Audit Table Rows
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
}
