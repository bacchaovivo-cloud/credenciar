import { motion } from 'framer-motion';

export const Skeleton = ({ className }) => (
  <div className={`bg-slate-200 dark:bg-slate-700/50 rounded-lg animate-shimmer-fast ${className}`} />
);

export const DashboardSkeleton = () => {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-10">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-6 overflow-hidden">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-64 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 overflow-hidden">
        <Skeleton className="h-6 w-40 mb-8" />
        <div className="flex items-end justify-between h-32 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${20 + Math.random() * 80}%` }} />
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-56 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden" />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center px-6 gap-4 overflow-hidden">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    ))}
  </div>
);
export default TableSkeleton;
