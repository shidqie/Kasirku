import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/75 dark:bg-zinc-800/80 ${className}`}
    />
  );
}

export function TableSkeletonRows({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  const widths = ["w-24", "w-36", "w-28", "w-20", "w-16", "w-32", "w-14"];
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-100 dark:border-zinc-800/60 last:border-0">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <td key={cIdx} className="px-4 py-3.5">
              <Skeleton
                className={`h-4 ${widths[(rIdx + cIdx) % widths.length]} max-w-full rounded-lg`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4"
        >
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="pt-2 space-y-5">
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-[14px]" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-40 rounded-xl" />
    </div>
  );
}

export function KasirGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 pt-1">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl p-3.5 border border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 min-h-[144px] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="w-7 h-7 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 w-full pb-12">
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <tbody>
            <TableSkeletonRows rows={5} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
