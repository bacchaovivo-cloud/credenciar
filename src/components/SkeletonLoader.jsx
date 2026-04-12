import { useMemo } from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ className }) => (
  <div className={`bg-[#2a374a] animate-pulse ${className}`} />
);

export const DashboardSkeleton = () => {
  // Fix: useMemo garante que as alturas são calculadas UMA vez e não mudam a cada re-render
  const barHeights = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7, 8].map(() => 20 + Math.random() * 80),
    []
  );

  return (
    <div className="pt-30 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto space-y-6">
      
      {/* Header Skeleton */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a2333] p-6 rounded-xl border border-[#2a374a]">
        <div>
          <Skeleton className="h-8 w-64 mb-2 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Top Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[#1a2333] rounded-xl border border-[#2a374a] p-5 overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Grid / Chart Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="h-64 bg-[#1a2333] rounded-xl border border-[#2a374a] p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-4 w-40 rounded-sm" />
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
            <div className="flex items-end justify-between flex-1 gap-3">
              {barHeights.map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-80 bg-[#1a2333] rounded-xl border border-[#2a374a] p-6 flex flex-col gap-4">
            <Skeleton className="h-4 w-32 rounded-sm mb-2" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Grid de Eventos Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-[#1a2333] rounded-xl border border-[#2a374a] overflow-hidden p-6 flex flex-col justify-between">
             <div>
               <Skeleton className="h-4 w-3/4 rounded-sm mb-3" />
               <Skeleton className="h-3 w-1/2 rounded-sm" />
             </div>
             <div className="mt-auto pt-4 border-t border-[#2a374a] flex justify-between">
               <Skeleton className="h-5 w-16 rounded-sm" />
               <Skeleton className="h-5 w-20 rounded-sm" />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
      <div key={i} className="h-16 bg-[#1a2333] rounded-lg border border-[#2a374a] flex items-center px-4 gap-4 overflow-hidden">
        <Skeleton className="h-4 w-4 rounded-sm hidden sm:block" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-48 rounded-sm" />
          <div className="flex gap-2">
             <Skeleton className="h-2 w-16 rounded-sm" />
             <Skeleton className="h-2 w-24 rounded-sm hidden sm:block" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-md hidden md:block" />
        <Skeleton className="h-6 w-20 rounded-md hidden sm:block" />
        <div className="flex gap-1.5">
           <Skeleton className="h-8 w-8 rounded-md" />
           <Skeleton className="h-8 w-8 rounded-md" />
           <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export default TableSkeleton;