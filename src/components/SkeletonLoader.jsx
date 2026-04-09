import { motion } from 'framer-motion';

export const Skeleton = ({ className }) => (
  <div className={`bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse ${className}`} />
);

export const DashboardSkeleton = () => {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl mb-2" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-6">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-64 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 mb-10 p-8">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-8" />
        <div className="flex items-end justify-between h-32 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg" style={{ height: `${Math.random() * 100}%` }} />
          ))}
        </div>
      </div>

      {/* List Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-56 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700" />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center px-6 gap-4">
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-1/6 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />
      </div>
    ))}
  </div>
);export default TableSkeleton;
